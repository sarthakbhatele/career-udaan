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
    const domain = await db.userDomain.findUnique({
        where: { id: domainId },
        include: { industryInsights: true }
    });

    if (!domain) return [];

    // Phase 5.1: Simple keyword-based retrieval
    // Phase 5.2+: Upgrade to embedding similarity
    const chunks = await db.contextChunk.findMany({
        where: {
            sourceType: "industry_insight",
            metadata: {
                path: ["industry"],
                equals: domain.industry
            }
        },
        take: limit
    });

    return chunks.map(c => c.content).join("\n\n");
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

    if (!context) {
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