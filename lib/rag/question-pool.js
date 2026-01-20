// import { db } from "@/lib/prisma";
// import { generateEmbedding } from "./core";
// import { buildQuizPrompt } from "./prompts";
// import { GoogleGenerativeAI } from "@google/generative-ai";

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// /**
//  * Calculate cosine similarity between two embeddings
//  */
// function cosineSimilarity(a, b) {
//     const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
//     const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
//     const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
//     return dotProduct / (magA * magB);
// }

// /**
//  * Filter out semantically similar questions
//  */
// async function deduplicateQuestions(newQuestions, existingEmbeddings, threshold = 0.85) {
//     const unique = [];

//     for (const q of newQuestions) {
//         const embedding = await generateEmbedding(q.question);

//         // Check similarity with existing
//         let isDuplicate = false;
//         for (const existing of existingEmbeddings) {
//             const similarity = cosineSimilarity(embedding, existing);
//             if (similarity > threshold) {
//                 isDuplicate = true;
//                 break;
//             }
//         }

//         if (!isDuplicate) {
//             unique.push({ ...q, embedding });
//             existingEmbeddings.push(embedding);
//         }
//     }

//     return unique;
// }

// /**
//  * Generate question pool with embeddings
//  */
// export async function generateQuestionPool({ domainId, difficulty, skills, context }) {
//     const existingPool = await db.rAGOutput.findUnique({
//         where: {
//             taskType_taskKey: {
//                 taskType: "question_pool",
//                 taskKey: `${domainId}:${difficulty}`,
//             },
//         },
//     });

//     // Return existing if valid
//     if (existingPool && (!existingPool.expiresAt || existingPool.expiresAt > new Date())) {
//         return existingPool.content.questions;
//     }

//     // Generate new pool
//     const prompt = buildQuizPrompt({ context, skills, difficulty });

//     const result = await model.generateContent(prompt);
//     const text = result.response.text().replace(/```(?:json)?\n?/g, "").trim();
//     const parsed = JSON.parse(text);

//     // Add embeddings and deduplicate
//     const existingEmbeddings = existingPool?.content.questions.map((q) => q.embedding) || [];
//     const uniqueQuestions = await deduplicateQuestions(parsed.questions, existingEmbeddings);

//     // Store pool
//     await db.rAGOutput.upsert({
//         where: {
//             taskType_taskKey: {
//                 taskType: "question_pool",
//                 taskKey: `${domainId}:${difficulty}`,
//             },
//         },
//         create: {
//             taskType: "question_pool",
//             taskKey: `${domainId}:${difficulty}`,
//             domainId,
//             content: { questions: uniqueQuestions },
//             questionCount: uniqueQuestions.length,
//             skillSet: skills,
//             difficulty,
//             model: "gemini-2.5-flash",
//             expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
//         },
//         update: {
//             content: { questions: uniqueQuestions },
//             questionCount: uniqueQuestions.length,
//             expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
//             version: (existingPool?.version || 0) + 1,
//         },
//     });

//     return uniqueQuestions;
// }

// /**
//  * Sample unseen questions for user
//  */
// export async function sampleQuestionsForUser({ userId, domainId, difficulty, count = 10 }) {
//     // Get question pool
//     const pool = await db.rAGOutput.findUnique({
//         where: {
//             taskType_taskKey: {
//                 taskType: "question_pool",
//                 taskKey: `${domainId}:${difficulty}`,
//             },
//         },
//     });

//     if (!pool) throw new Error("Question pool not ready");

//     // Get user's history
//     const history = await db.userQuestionHistory.findMany({
//         where: { userId, domainId },
//         select: { questionId: true, embedding: true },
//     });

//     const seenIds = new Set(history.map((h) => h.questionId));
//     const seenEmbeddings = history.map((h) => h.embedding);

//     // Filter unseen and semantically different
//     const available = pool.content.questions.filter((q) => {
//         const crypto = require('crypto');
//         const questionId = crypto.createHash('md5').update(q.question).digest('hex').slice(0, 16);

//         // Exact duplicate check
//         if (seenIds.has(questionId)) return false;

//         // Semantic similarity check
//         for (const seenEmb of seenEmbeddings) {
//             if (cosineSimilarity(q.embedding, seenEmb) > 0.90) return false;
//         }

//         return true;
//     });

//     // Shuffle and take
//     const shuffled = available.sort(() => Math.random() - 0.5);
//     const selected = shuffled.slice(0, count);

//     // Record as seen
//     await db.userQuestionHistory.createMany({
//         data: selected.map((q) => ({
//             userId,
//             domainId,
//             questionId: Buffer.from(q.question).toString("base64").slice(0, 16),
//             questionText: q.question,
//             embedding: q.embedding,
//         })),
//         skipDuplicates: true,
//     });

//     return selected.map(({ embedding, ...q }) => q); // Remove embeddings from response
// }

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
            expiresAt: null, // Never expires
        },
        update: {
            content: { questions: allQuestions },
            questionCount: allQuestions.length,
            version: (existingPool?.version || 0) + 1,
        },
    });

    console.log(`✅ Pool expanded: ${allQuestions.length} total questions for ${poolKey}`);
    return allQuestions.length;
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