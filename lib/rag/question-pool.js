// v2
/**
 * PERFORMANCE NOTE:
 * Semantic deduplication (embeddings + cosine similarity) is expensive.
 * Only runs during:
 * - Cron-based pool expansion (nightly, acceptable)
 * - Emergency fallback (rare)
 * 
 * NEVER runs during quiz attempts (sampling is pure DB operation).
 */
import { db } from "@/lib/prisma";
import { generateEmbedding } from "./core";
import { buildQuizPrompt } from "./prompts";
import { RAG_CONFIG } from "./config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

function cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magA * magB);
}

async function deduplicateQuestions(newQuestions, existingEmbeddings) {
    const unique = [];

    for (const q of newQuestions) {
        const embedding = await generateEmbedding(q.question);

        let isDuplicate = false;
        for (const existing of existingEmbeddings) {
            const similarity = cosineSimilarity(embedding, existing);
            if (similarity > RAG_CONFIG.SEMANTIC_SIMILARITY_THRESHOLD) {
                isDuplicate = true;
                break;
            }
        }

        if (!isDuplicate) {
            unique.push({ ...q, embedding });
            existingEmbeddings.push(embedding);
        }
    }

    return unique;
}

/**
 * Generate batch and append to pool
 * CALLED BY: Cron job or emergency fallback
 */
export async function expandQuestionPool({ domainId, difficulty, skills, context }) {
    const poolKey = `${domainId}:${difficulty}`;

    const existingPool = await db.rAGOutput.findUnique({
        where: {
            taskType_taskKey: {
                taskType: "question_pool",
                taskKey: poolKey,
            },
        },
    });

    const existingQuestions = existingPool?.content.questions || [];
    const existingEmbeddings = existingQuestions.map((q) => q.embedding);

    // Generate new batch
    const prompt = buildQuizPrompt({
        context,
        skills,
        difficulty,
        existingQuestions: existingQuestions.map((q) => q.question),
        batchSize: RAG_CONFIG.BATCH_SIZE,
    });

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```(?:json)?\n?/g, "").trim();
        const parsed = JSON.parse(text);

        // Deduplicate
        const uniqueQuestions = await deduplicateQuestions(
            parsed.questions,
            existingEmbeddings
        );

        // Append to pool
        const allQuestions = [...existingQuestions, ...uniqueQuestions];

        await db.rAGOutput.upsert({
            where: {
                taskType_taskKey: {
                    taskType: "question_pool",
                    taskKey: poolKey,
                },
            },
            create: {
                taskType: "question_pool",
                taskKey: poolKey,
                domainId,
                content: { questions: allQuestions },
                questionCount: allQuestions.length,
                skillSet: skills,
                difficulty,
                model: "gemini-2.5-flash",
                expiresAt: null,
            },
            update: {
                content: { questions: allQuestions },
                questionCount: allQuestions.length,
                version: (existingPool?.version || 0) + 1,
            },
        });

        console.log(`✅ Pool expanded: ${allQuestions.length} total questions for ${poolKey}`);
        return allQuestions.length;
    } catch (error) {
        console.error(`❌ Pool expansion failed for ${poolKey}:`, error.message);

        // Re-throw with context for Inngest retry
        if (error.message?.includes("fetch failed") || error.message?.includes("ECONNREFUSED")) {
            throw new Error(`NETWORK_ERROR: ${error.message}`);
        }

        throw error;
    }
}
/**
 * Sample unseen questions for user
 * NO LLM CALL - pure DB operation
 */
export async function sampleQuestionsForUser({ userId, domainId, difficulty }) {
    const poolKey = `${domainId}:${difficulty}`;

    const pool = await db.rAGOutput.findUnique({
        where: {
            taskType_taskKey: {
                taskType: "question_pool",
                taskKey: poolKey,
            },
        },
    });

    if (!pool || pool.questionCount === 0) {
        throw new Error("POOL_NOT_READY");
    }

    // Get user's history
    const history = await db.userQuestionHistory.findMany({
        where: { userId, domainId },
        select: { questionId: true, embedding: true },
    });

    const seenIds = new Set(history.map((h) => h.questionId));
    const seenEmbeddings = history.map((h) => h.embedding);

    // Filter unseen
    const available = pool.content.questions.filter((q) => {
        const questionId = crypto.createHash("md5").update(q.question).digest("hex").slice(0, 16);

        if (seenIds.has(questionId)) return false;

        // Semantic check
        for (const seenEmb of seenEmbeddings) {
            if (cosineSimilarity(q.embedding, seenEmb) > RAG_CONFIG.SEMANTIC_SIMILARITY_THRESHOLD) {
                return false;
            }
        }

        return true;
    });

    if (available.length < RAG_CONFIG.QUESTIONS_PER_QUIZ) {
        throw new Error("POOL_EXHAUSTED");
    }

    // Shuffle and take
    const shuffled = available.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, RAG_CONFIG.QUESTIONS_PER_QUIZ);

    // Record as seen
    await db.userQuestionHistory.createMany({
        data: selected.map((q) => ({
            userId,
            domainId,
            questionId: crypto.createHash("md5").update(q.question).digest("hex").slice(0, 16),
            questionText: q.question,
            embedding: q.embedding,
        })),
        skipDuplicates: true,
    });

    return selected.map(({ embedding, ...q }) => q);
}