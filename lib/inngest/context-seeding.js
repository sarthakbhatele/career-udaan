// hybrid context seeding for industry insights

import { db } from "../prisma";
import { inngest } from "./client";
import { generateEmbedding } from "@/lib/rag/core";

/**
 * IDEMPOTENT seeding function - safe to call multiple times
 */
async function seedContextForIndustry(industry) {
  const insight = await db.industryInsight.findUnique({
    where: { industry },
  });

  if (!insight || insight.generationStatus !== "completed") {
    console.log(`⏭️ Skipping ${industry} - not ready`);
    return null;
  }

  const content = `
Industry: ${insight.industry}
Market Outlook: ${insight.marketOutlook}
Growth Rate: ${insight.growthRate}%
Demand Level: ${insight.demandLevel}

Key Trends:
${insight.keyTrends.join("\n")}

Top Skills in Demand:
${insight.topSkills.join(", ")}

Recommended Skills to Learn:
${insight.recommendedSkills.join(", ")}
  `.trim();

  const embedding = await generateEmbedding(content);

  await db.contextChunk.upsert({
    where: {
      sourceType_sourceId: {
        sourceType: "industry_insight",
        sourceId: insight.id,
      },
    },
    create: {
      sourceType: "industry_insight",
      sourceId: insight.id,
      content,
      embedding,
      metadata: { industry: insight.industry },
    },
    update: {
      content,
      embedding,
      metadata: { industry: insight.industry },
    },
  });

  console.log(`✅ Seeded context for ${industry}`);
  return industry;
}

// EVENT-DRIVEN: Seed immediately after insight generation
export const seedContextOnInsightComplete = inngest.createFunction(
  {
    id: "seed-context-on-insight-complete",
    concurrency: { limit: 5 },
  },
  { event: "industry/insight.completed" },
  async ({ event, step }) => {
    const { industry } = event.data;

    await step.run(`Seed context for ${industry}`, async () => {
      return await seedContextForIndustry(industry);
    });

    return { success: true, industry };
  }
);

// CRON-BASED: Weekly refresh of all completed insights
export const seedContextChunksCron = inngest.createFunction(
  {
    id: "seed-context-chunks-cron",
    concurrency: { limit: 1 },
  },
  { cron: "0 2 * * 0" }, // Sunday 2 AM
  async ({ step }) => {
    const insights = await step.run("Fetch completed insights", async () => {
      return await db.industryInsight.findMany({
        where: { generationStatus: "completed" },
        select: { industry: true },
      });
    });

    const results = [];
    for (const { industry } of insights) {
      const result = await step.run(`Process ${industry}`, async () => {
        return await seedContextForIndustry(industry);
      });
      if (result) results.push(result);
    }

    return { processed: results.length };
  }
);