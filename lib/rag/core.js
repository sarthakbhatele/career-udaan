// lib/rag/core.js
import { db } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
const generationModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * Generate embedding for text
 */
export async function generateEmbedding(text) {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
}

/**
 * Retrieve relevant context chunks
 */
export async function retrieveContext({ taskType, domainId, limit = 5 }) {
    // Fetch domain (REQUIRED)
    const domain = domainId
        ? await db.userDomain.findUnique({
            where: { id: domainId },
        })
        : null;

    if (domainId && !domain) {
        throw new Error("Domain not found for RAG generation");
    }
    // NEW: Fetch IndustryInsight directly by industry string
    const insight = await db.industryInsight.findUnique({
        where: { industry: domain.industry }
    });

    if (!insight || insight.generationStatus !== "completed") {
        return null; // No valid context
    }

    // Build context string from insight
    return `
Industry: ${insight.industry}
Market Outlook: ${insight.marketOutlook}
Growth Rate: ${insight.growthRate}%
Demand: ${insight.demandLevel}

Key Trends:
${insight.keyTrends.join("\n")}

Top Skills:
${insight.topSkills.join(", ")}

Recommended Skills:
${insight.recommendedSkills.join(", ")}
  `.trim();
}

/**
 * Build grounded prompt
 */
export function buildGroundedPrompt({ taskType, context, taskParams }) {
    const base = `You are an expert career coach. Use ONLY the following context to answer.

CONTEXT:
${context}

TASK: ${taskType}
`;

    switch (taskType) {
        case "quiz":
            return `${base}
INSTRUCTIONS:
- Generate ${taskParams.questionCount} ${taskParams.difficulty} difficulty questions
- Focus on: ${taskParams.skills?.join(", ")}
- Return JSON: { "questions": [...] }
`;

        case "resume_feedback":
            return `${base}
RESUME:
${taskParams.resumeContent}

INSTRUCTIONS:
- Provide 3-5 specific improvements
- Reference salary/skill trends from context
- Return JSON: { "feedback": [...] }
`;

        default:
            throw new Error(`Unknown task type: ${taskType}`);
    }
}

/**
 * Generate RAG output (idempotent)
 */
export async function generateRAGOutput({ taskType, taskKey, domainId, taskParams }) {
    // 1. Check cache
    const existing = await db.rAGOutput.findUnique({
        where: { taskType_taskKey: { taskType, taskKey } }
    });

    if (existing && (!existing.expiresAt || existing.expiresAt > new Date())) {
        return existing.content;
    }

    // 2. Retrieve context
    const context = await retrieveContext({ taskType, domainId });

    // console.log("DEBUG:", {
    //     domainIndustry: domain.industry,
    //     insightFound: !!insight,
    //     insightStatus: insight?.generationStatus,
    //     insightId: insight?.id
    // });

    if (!context || context.length === 0) {
        throw new Error("No context available for RAG generation");
    }


    // 3. Build prompt
    const prompt = buildGroundedPrompt({ taskType, context, taskParams });

    // 4. Call LLM
    const result = await generationModel.generateContent(prompt);
    const text = result.response.text().replace(/```(?:json)?\n?/g, "").trim();
    const content = JSON.parse(text);

    // 5. Store output
    await db.rAGOutput.upsert({
        where: { taskType_taskKey: { taskType, taskKey } },
        create: {
            taskType,
            taskKey,
            domainId,
            content,
            promptTokens: result.response.usageMetadata?.promptTokenCount,
            completionTokens: result.response.usageMetadata?.candidatesTokenCount,
            model: "gemini-2.5-flash",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        },
        update: {
            content,
            promptTokens: result.response.usageMetadata?.promptTokenCount,
            completionTokens: result.response.usageMetadata?.candidatesTokenCount,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
    });

    return content;
}