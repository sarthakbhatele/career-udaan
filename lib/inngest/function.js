import { db } from "@/lib/prisma";
import { inngest } from "./client";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Weekly batch refresh (cron job)
export const generateIndustryInsights = inngest.createFunction(
  {
    id: "generate-industry-insights-batch",
    concurrency: {
      limit: 1, // Only 1 batch job at a time
    },
    retries: 0, // Don't retry entire batch - handle per-industry
  },
  { cron: "0 0 * * 0" }, // Weekly (Sunday midnight)
  async ({ step }) => {
    // Fetch stale or pending insights
    const industries = await step.run("Fetch industries needing refresh", async () => {
      return await db.industryInsight.findMany({
        where: {
          OR: [
            { generationStatus: "pending" },
            {
              AND: [
                { generationStatus: "failed" },
                {
                  lastAttemptAt: {
                    lte: new Date(Date.now() - 60 * 60 * 1000) // 1 hour cooldown
                  }
                }
              ]
            },
            { nextUpdate: { lte: new Date() } }, // Stale
          ],
        },
        select: { industry: true },
      });
    });

    console.log(`📊 Refreshing ${industries.length} industry insights`);

    // Trigger individual generation jobs (Inngest will queue them)
    for (const { industry } of industries) {
      await inngest.send({
        name: "industry/generate",
        data: { industry },
      });
    }

    return { processed: industries.length };
  }
);

// Single industry generation (event-driven)
export const generateSingleIndustryInsight = inngest.createFunction(
  {
    id: "generate-single-industry-insight",
    concurrency: {
      limit: 3, // Max 3 concurrent Gemini calls (respects free tier)
      key: "event.data.industry", // Deduplicate per industry
    },
    retries: 2, // Retry on transient failures with backoff
  },
  { event: "industry/generate" },
  async ({ event, step }) => {
    const { industry } = event.data;

    // Fetch current state
    const insight = await step.run("Fetch insight", async () => {
      return await db.industryInsight.findUnique({
        where: { industry },
      });
    });

    if (!insight) {
      throw new Error(`Industry insight not found: ${industry}`);
    }

    // Cooldown check: Don't retry if attempted within last 5 minutes
    const cooldownMs = 5 * 60 * 1000; // 5 minutes
    const timeSinceLastAttempt = Date.now() - insight.lastAttemptAt.getTime();

    if (timeSinceLastAttempt < cooldownMs) {
      console.log(`⏳ Skipping ${industry} - cooldown active (${Math.ceil((cooldownMs - timeSinceLastAttempt) / 1000)}s remaining)`);
      return { skipped: true, reason: "cooldown" };
    }

    // Mark as generating + update lastAttemptAt
    await step.run("Mark as generating", async () => {
      await db.industryInsight.update({
        where: { industry },
        data: {
          generationStatus: "generating",
          lastAttemptAt: new Date(),
        },
      });
    });

    // Generate insights via Gemini
    const insights = await step.run("Generate insights", async () => {
      const prompt = `
        Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
        {
          "salaryRanges": [
            { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
          ],
          "growthRate": number,
          "demandLevel": "High" | "Medium" | "Low",
          "topSkills": ["skill1", "skill2"],
          "marketOutlook": "Positive" | "Neutral" | "Negative",
          "keyTrends": ["trend1", "trend2"],
          "recommendedSkills": ["skill1", "skill2"]
        }
        
        IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
        Include at least 5 common roles for salary ranges.
        Growth rate should be a percentage.
        Include at least 5 skills and trends.
      `;

      try {
        const res = await model.generateContent(prompt);
        const text = res.response.candidates[0].content.parts[0].text || "";
        const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
        return JSON.parse(cleanedText);
      } catch (error) {
        // Handle 429 specifically
        if (error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED")) {
          throw new Error("RATE_LIMIT_EXCEEDED");
        }
        throw error;
      }
    });

    // Save generated insights
    await step.run("Save insights", async () => {
      await db.industryInsight.update({
        where: { industry },
        data: {
          ...insights,
          lastUpdated: new Date(),
          nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          generationStatus: "completed",
          generationError: null,
        },
      });
    });

    console.log(`✅ Generated insights for ${industry}`);
    return { success: true };
  }
).onFailure(async ({ event, error }) => {
  // Handle permanent failures
  const { industry } = event.data;

  await db.industryInsight.update({
    where: { industry },
    data: {
      generationStatus: "failed",
      generationError: error.message.substring(0, 500),
    },
  });

  console.error(`❌ Failed to generate insights for ${industry}:`, error.message);
});