// // v2 // v open ai seq
// /**
//  * PERFORMANCE NOTE:
//  * Semantic deduplication (embeddings + cosine similarity) is expensive.
//  * Only runs during:
//  * - Cron-based pool expansion (nightly, acceptable)
//  * - Emergency fallback (rare)
//  * 
//  * NEVER runs during quiz attempts (sampling is pure DB operation).
//  */
// import { db } from "@/lib/prisma";
// import { generateEmbedding } from "./core";
// import { buildQuizPrompt } from "./prompts";
// import { RAG_CONFIG } from "./config";
// // import { GoogleGenerativeAI } from "@google/generative-ai";
// import crypto from "crypto";

// import OpenAI from "openai";

// const openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
//     baseURL: "https://api.chatanywhere.tech/v1"
// });

// // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// // const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// function cosineSimilarity(a, b) {
//     const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
//     const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
//     const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
//     return dotProduct / (magA * magB);
// }

// async function deduplicateQuestions(newQuestions, existingEmbeddings) {
//     const unique = [];

//     for (const q of newQuestions) {
//         const embedding = await generateEmbedding(q.question);

//         let isDuplicate = false;
//         for (const existing of existingEmbeddings) {
//             const similarity = cosineSimilarity(embedding, existing);
//             if (similarity > RAG_CONFIG.SEMANTIC_SIMILARITY_THRESHOLD) {
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
//  * Generate questions in mini-batches up to maxQuestions limit
//  * CALLED BY: Cron job or emergency fallback
//  */
// // export async function expandQuestionPool({
// //     domainId,
// //     difficulty,
// //     skills,
// //     context,
// //     maxQuestions = RAG_CONFIG.MACRO_BATCH_SIZE // Default to macro batch size
// // }) {
// //     const poolKey = `${domainId}:${difficulty}`;

// //     const existingPool = await db.rAGOutput.findUnique({
// //         where: {
// //             taskType_taskKey: {
// //                 taskType: "question_pool",
// //                 taskKey: poolKey,
// //             },
// //         },
// //     });

// //     const existingQuestions = existingPool?.content.questions || [];
// //     const existingEmbeddings = existingQuestions.map((q) => q.embedding);

// //     // Calculate mini-batches needed
// //     const iterations = Math.ceil(maxQuestions / RAG_CONFIG.MINI_BATCH_SIZE);
// //     const stats = { attempted: 0, succeeded: 0, failed: 0, errors: [] };

// //     console.log(`🔄 Expanding pool ${poolKey}: ${iterations} mini-batches (${RAG_CONFIG.MINI_BATCH_SIZE} questions each)`);

// //     // Generate mini-batches sequentially
// //     for (let i = 0; i < iterations; i++) {
// //         stats.attempted++;

// //         try {
// //             // Build prompt with existing questions for deduplication
// //             const prompt = buildQuizPrompt({
// //                 context,
// //                 skills,
// //                 difficulty,
// //                 existingQuestions: existingQuestions.map((q) => q.question),
// //                 batchSize: RAG_CONFIG.MINI_BATCH_SIZE,
// //             });

// //             // Generate mini-batch with retry logic
// //             const result = await generateBatchWithRetry(prompt);
// //             const text = result.response.text().replace(/```(?:json)?\n?/g, "").trim();
// //             const parsed = JSON.parse(text);

// //             // Deduplicate against existing pool
// //             const uniqueQuestions = await deduplicateQuestions(
// //                 parsed.questions,
// //                 existingEmbeddings
// //             );

// //             if (uniqueQuestions.length === 0) {
// //                 console.log(`⚠️ Mini-batch ${i + 1}/${iterations}: All questions were duplicates`);
// //                 stats.failed++;
// //                 continue;
// //             }

// //             // Append to pool immediately
// //             existingQuestions.push(...uniqueQuestions);
// //             existingEmbeddings.push(...uniqueQuestions.map(q => q.embedding));

// //             await db.rAGOutput.upsert({
// //                 where: {
// //                     taskType_taskKey: {
// //                         taskType: "question_pool",
// //                         taskKey: poolKey,
// //                     },
// //                 },
// //                 create: {
// //                     taskType: "question_pool",
// //                     taskKey: poolKey,
// //                     domainId,
// //                     content: { questions: existingQuestions },
// //                     questionCount: existingQuestions.length,
// //                     skillSet: skills,
// //                     difficulty,
// //                     model: "gemini-2.5-flash",
// //                     expiresAt: null,
// //                 },
// //                 update: {
// //                     content: { questions: existingQuestions },
// //                     questionCount: existingQuestions.length,
// //                     version: (existingPool?.version || 0) + 1,
// //                 },
// //             });

// //             stats.succeeded++;
// //             console.log(`✅ Mini-batch ${i + 1}/${iterations}: Added ${uniqueQuestions.length} questions (pool size: ${existingQuestions.length})`);

// //             // Rate limit protection - wait between batches
// //             if (i < iterations - 1) {
// //                 await new Promise(resolve => setTimeout(resolve, RAG_CONFIG.BATCH_DELAY_MS));
// //             }

// //         } catch (error) {
// //             stats.failed++;
// //             stats.errors.push(error.message);
// //             console.error(`❌ Mini-batch ${i + 1}/${iterations} failed:`, error.message);

// //             // Continue to next batch instead of failing entire expansion
// //             continue;
// //         }
// //     }

// //     console.log(`📊 Pool expansion complete for ${poolKey}:`, stats);
// //     return existingQuestions.length;
// // }

// /**
//  * Generate questions in mini-batches up to maxQuestions limit
//  * CALLED BY: Cron job or emergency fallback
//  */
// export async function expandQuestionPool({
//     domainId,
//     difficulty,
//     skills,
//     context,
//     maxQuestions = RAG_CONFIG.MACRO_BATCH_SIZE
// }) {
//     const poolKey = `${domainId}:${difficulty}`;

//     const existingPool = await db.rAGOutput.findUnique({
//         where: {
//             taskType_taskKey: {
//                 taskType: "question_pool",
//                 taskKey: poolKey,
//             },
//         },
//     });

//     const existingQuestions = existingPool?.content.questions || [];
//     const existingEmbeddings = existingQuestions.map((q) => q.embedding);

//     const iterations = Math.ceil(maxQuestions / RAG_CONFIG.MINI_BATCH_SIZE);

//     // ✅ Enhanced stats tracking
//     const stats = {
//         attempted: 0,
//         succeeded: 0,
//         failed: 0,
//         errors: [],
//         apiRequests: 0,
//         totalTokens: 0,
//         totalDuration: 0,
//         questionsAdded: 0
//     };

//     console.log(`🔄 Expanding pool ${poolKey}: ${iterations} mini-batches (${RAG_CONFIG.MINI_BATCH_SIZE} questions each)`);
//     console.log(`📊 Starting pool size: ${existingQuestions.length}`);

//     for (let i = 0; i < iterations; i++) {
//         stats.attempted++;

//         try {
//             const prompt = buildQuizPrompt({
//                 context,
//                 skills,
//                 difficulty,
//                 existingQuestions: existingQuestions.map((q) => q.question),
//                 batchSize: RAG_CONFIG.MINI_BATCH_SIZE,
//             });

//             // ✅ Track API request
//             stats.apiRequests++;
//             const result = await generateBatchWithRetry(prompt);

//             // ✅ Track tokens and duration
//             stats.totalTokens += result.usage.total_tokens;
//             stats.totalDuration += result.duration;

//             // Parse response
//             const text = result.content.replace(/```(?:json)?\n?/g, "").trim();
//             const parsed = JSON.parse(text);

//             // Deduplicate against existing pool
//             const uniqueQuestions = await deduplicateQuestions(
//                 parsed.questions,
//                 existingEmbeddings
//             );

//             if (uniqueQuestions.length === 0) {
//                 console.log(`⚠️ Mini-batch ${i + 1}/${iterations}: All questions were duplicates`);
//                 stats.failed++;
//                 continue;
//             }

//             // Append to pool immediately
//             existingQuestions.push(...uniqueQuestions);
//             existingEmbeddings.push(...uniqueQuestions.map(q => q.embedding));
//             stats.questionsAdded += uniqueQuestions.length;

//             await db.rAGOutput.upsert({
//                 where: {
//                     taskType_taskKey: {
//                         taskType: "question_pool",
//                         taskKey: poolKey,
//                     },
//                 },
//                 create: {
//                     taskType: "question_pool",
//                     taskKey: poolKey,
//                     domainId,
//                     content: { questions: existingQuestions },
//                     questionCount: existingQuestions.length,
//                     skillSet: skills,
//                     difficulty,
//                     model: "gpt-4o-mini", // ✅ Updated model name
//                     expiresAt: null,
//                 },
//                 update: {
//                     content: { questions: existingQuestions },
//                     questionCount: existingQuestions.length,
//                     version: (existingPool?.version || 0) + 1,
//                 },
//             });

//             stats.succeeded++;
//             console.log(`✅ Mini-batch ${i + 1}/${iterations}: Added ${uniqueQuestions.length} questions (pool size: ${existingQuestions.length})`);

//             // Rate limit protection
//             if (i < iterations - 1) {
//                 await new Promise(resolve => setTimeout(resolve, RAG_CONFIG.BATCH_DELAY_MS));
//             }

//         } catch (error) {
//             stats.failed++;
//             stats.errors.push(error.message);
//             console.error(`❌ Mini-batch ${i + 1}/${iterations} failed:`, error.message);
//             continue;
//         }
//     }

//     // ✅ Detailed summary logging
//     console.log(`\n📊 ============ POOL EXPANSION SUMMARY ============`);
//     console.log(`🎯 Pool: ${poolKey}`);
//     console.log(`📈 Pool size: ${existingQuestions.length} questions`);
//     console.log(`✨ Questions added this run: ${stats.questionsAdded}`);
//     console.log(`🔄 Mini-batches: ${stats.succeeded}/${stats.attempted} succeeded`);
//     console.log(`📡 Total API requests: ${stats.apiRequests}`);
//     console.log(`🪙 Total tokens used: ${stats.totalTokens}`);
//     console.log(`⏱️  Total API time: ${stats.totalDuration.toFixed(2)}s`);
//     console.log(`💰 Avg tokens/request: ${(stats.totalTokens / stats.apiRequests).toFixed(0)}`);
//     console.log(`⚡ Avg request time: ${(stats.totalDuration / stats.apiRequests).toFixed(2)}s`);
//     if (stats.failed > 0) {
//         console.log(`❌ Failed batches: ${stats.failed}`);
//         console.log(`🔍 Errors: ${stats.errors.join(', ')}`);
//     }
//     console.log(`================================================\n`);

//     return existingQuestions.length;
// }

// /**
//  * Generate batch with retry logic for transient errors
//  */
// async function generateBatchWithRetry(prompt, attempt = 1) {
//     const startTime = Date.now();

//     try {
//         console.log(`🔄 API Request #${attempt} starting...`);

//         const response = await openai.chat.completions.create({
//             model: "gpt-4o-mini",
//             messages: [
//                 {
//                     role: "user",
//                     content: prompt
//                 }
//             ],
//             temperature: 0.7,
//         });

//         const duration = (Date.now() - startTime) / 1000;
//         const content = response.choices[0].message.content;

//         console.log(`✅ API Request #${attempt} succeeded (${duration.toFixed(2)}s, ${response.usage.total_tokens} tokens)`);

//         return {
//             content,
//             usage: response.usage,
//             duration
//         };

//     } catch (error) {
//         const duration = (Date.now() - startTime) / 1000;
//         console.error(`❌ API Request #${attempt} failed after ${duration.toFixed(2)}s:`, error.message);

//         const isRetryable =
//             error.message?.includes('503') ||
//             error.message?.includes('ECONNREFUSED') ||
//             error.message?.includes('fetch failed') ||
//             error.message?.includes('RESOURCE_EXHAUSTED') ||
//             error.message?.includes('NETWORK_ERROR') ||
//             error.status === 429 || // Rate limit
//             error.status >= 500; // Server errors

//         if (attempt < RAG_CONFIG.MAX_RETRIES_PER_BATCH && isRetryable) {
//             const delay = attempt * 2000; // Exponential backoff
//             console.log(`⏳ Retrying batch (attempt ${attempt + 1}/${RAG_CONFIG.MAX_RETRIES_PER_BATCH}) after ${delay}ms`);
//             await new Promise(resolve => setTimeout(resolve, delay));
//             return generateBatchWithRetry(prompt, attempt + 1);
//         }

//         throw error;
//     }
// }
// /**
//  * Sample unseen questions for user
//  * NO LLM CALL - pure DB operation
//  */
// export async function sampleQuestionsForUser({ userId, domainId, difficulty }) {
//     const poolKey = `${domainId}:${difficulty}`;

//     const pool = await db.rAGOutput.findUnique({
//         where: {
//             taskType_taskKey: {
//                 taskType: "question_pool",
//                 taskKey: poolKey,
//             },
//         },
//     });

//     if (!pool || pool.questionCount === 0) {
//         throw new Error("POOL_NOT_READY");
//     }

//     // Get user's history
//     const history = await db.userQuestionHistory.findMany({
//         where: { userId, domainId },
//         select: { questionId: true, embedding: true },
//     });

//     const seenIds = new Set(history.map((h) => h.questionId));
//     const seenEmbeddings = history.map((h) => h.embedding);

//     // Filter unseen
//     const available = pool.content.questions.filter((q) => {
//         const questionId = crypto.createHash("md5").update(q.question).digest("hex").slice(0, 16);

//         if (seenIds.has(questionId)) return false;

//         // Semantic check
//         for (const seenEmb of seenEmbeddings) {
//             if (cosineSimilarity(q.embedding, seenEmb) > RAG_CONFIG.SEMANTIC_SIMILARITY_THRESHOLD) {
//                 return false;
//             }
//         }

//         return true;
//     });

//     if (available.length < RAG_CONFIG.QUESTIONS_PER_QUIZ) {
//         throw new Error("POOL_EXHAUSTED");
//     }

//     // Shuffle and take
//     const shuffled = available.sort(() => Math.random() - 0.5);
//     const selected = shuffled.slice(0, RAG_CONFIG.QUESTIONS_PER_QUIZ);

//     // Record as seen
//     await db.userQuestionHistory.createMany({
//         data: selected.map((q) => ({
//             userId,
//             domainId,
//             questionId: crypto.createHash("md5").update(q.question).digest("hex").slice(0, 16),
//             questionText: q.question,
//             embedding: q.embedding,
//         })),
//         skipDuplicates: true,
//     });

//     return selected.map(({ embedding, ...q }) => q);
// }


// v open ai parallel
import { db } from "@/lib/prisma";
import { generateEmbedding } from "./core";
import { buildQuizPrompt } from "./prompts";
import { RAG_CONFIG } from "./config";
import OpenAI from "openai";
import crypto from "crypto";

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || "https://api.chatanywhere.tech/v1", // Support for your proxy if needed
});

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

// Helper: Retry Batch for OpenAI (Crash Handler)
async function generateBatchWithRetry(prompt, attempt = 1) {
    const startTime = Date.now();

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" } // ✅ Guarantees valid JSON
        });

        const duration = (Date.now() - startTime) / 1000;

        return {
            content: response.choices[0].message.content,
            duration,
            usage: response.usage
        };

    } catch (error) {
        const duration = (Date.now() - startTime) / 1000;

        const isRetryable =
            error.status === 429 || // Rate limit
            error.status >= 500 ||  // Server error
            error.message?.includes('network');

        if (attempt < RAG_CONFIG.MAX_RETRIES_PER_BATCH && isRetryable) {
            const delay = attempt * 2000;
            console.log(`⏳ Retrying batch (attempt ${attempt + 1}) after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return generateBatchWithRetry(prompt, attempt + 1);
        }

        throw error;
    }
}

// Generate questions in mini-batches up to maxQuestions limit
export async function expandQuestionPool({
    domainId,
    difficulty,
    skills,
    context,
    maxQuestions = RAG_CONFIG.MACRO_BATCH_SIZE
}) {
    const poolKey = `${domainId}:${difficulty}`;
    const LOG_TAG = `[${difficulty.toUpperCase()}]`;

    // 1. Fetch Existing Pool
    const existingPool = await db.rAGOutput.findUnique({
        where: { taskType_taskKey: { taskType: "question_pool", taskKey: poolKey } },
    });
    const existingQuestions = existingPool?.content.questions || [];
    const existingEmbeddings = existingQuestions.map((q) => q.embedding);

    // ============================================================
    // 👮‍♂️ THE WATCHMAN (Limit Check)
    // ============================================================
    const HARD_LIMIT = 1000; // Limit set to 1000 questions
    const currentCount = existingQuestions.length;

    // SCENARIO 1: Pool Full Hai -> STOP
    if (currentCount >= HARD_LIMIT) {
        console.log(`${LOG_TAG} 🛑 Watchman: Pool Full (${currentCount}/${HARD_LIMIT}). Stopping.`);
        return currentCount;
    }

    // SCENARIO 2: Jagah hai -> Calculate karo kitne aur chahiye
    const spaceLeft = HARD_LIMIT - currentCount;
    const effectiveMax = Math.min(maxQuestions, spaceLeft); // Jagaah se zyada mat banao
    const iterations = Math.ceil(effectiveMax / RAG_CONFIG.MINI_BATCH_SIZE);

    const stats = { attempted: 0, succeeded: 0, failed: 0, questionsAdded: 0, totalDuration: 0, errors: [] };

    console.log(`${LOG_TAG} 🔄 Expanding pool: ${iterations} batches (Space left: ${spaceLeft})`);

    for (let i = 0; i < iterations; i++) {
        stats.attempted++;

        try {
            // Check Saturation for Prompt (Optional: just to make generic prompt smarter)
            const isSaturated = existingQuestions.length > 500;

            const prompt = buildQuizPrompt({
                context,
                skills,
                difficulty,
                existingQuestions: existingQuestions.map((q) => q.question),
                batchSize: RAG_CONFIG.MINI_BATCH_SIZE,
                isSaturated: isSaturated // Bas ye flag bhej rahe hain, Hybrid logic nahi
            });

            // 1. Generate
            const result = await generateBatchWithRetry(prompt);
            stats.totalDuration += result.duration;

            let parsed;
            try {
                parsed = JSON.parse(result.content);
            } catch (e) {
                const cleanText = result.content.replace(/```json/g, "").replace(/```/g, "");
                try { parsed = JSON.parse(cleanText); } catch (err) { throw new Error("Malformed JSON response"); }
            }
            const questionsList = Array.isArray(parsed) ? parsed : (parsed.questions || []);

            // 2. Deduplicate (The Guard)
            const uniqueQuestions = await deduplicateQuestions(questionsList, existingEmbeddings);

            if (uniqueQuestions.length === 0) {
                console.log(`${LOG_TAG} ⚠️ Batch ${i + 1}: All duplicates (Guard blocked them)`);
                stats.failed++;
                continue;
            }

            // Update Memory
            existingQuestions.push(...uniqueQuestions);
            existingEmbeddings.push(...uniqueQuestions.map(q => q.embedding));
            stats.questionsAdded += uniqueQuestions.length;

            // 3. Jitter
            const jitter = Math.floor(Math.random() * 2000) + 500;
            await new Promise(resolve => setTimeout(resolve, jitter));

            // 4. Retry Logic for DB Save
            let saved = false;
            let saveAttempts = 0;

            while (!saved && saveAttempts < 3) {
                try {
                    saveAttempts++;
                    await db.rAGOutput.upsert({
                        where: {
                            taskType_taskKey: { taskType: "question_pool", taskKey: poolKey },
                        },
                        create: {
                            taskType: "question_pool",
                            taskKey: poolKey,
                            domainId,
                            content: { questions: existingQuestions },
                            questionCount: existingQuestions.length,
                            skillSet: skills,
                            difficulty,
                            model: "gpt-4o-mini",
                            expiresAt: null,
                        },
                        update: {
                            content: { questions: existingQuestions },
                            questionCount: existingQuestions.length,
                            version: (existingPool?.version || 0) + 1,
                        },
                    });
                    saved = true;
                } catch (dbError) {
                    console.warn(`${LOG_TAG} ⚠️ DB Save Failed (Attempt ${saveAttempts}/3): ${dbError.message}`);
                    if (saveAttempts >= 3) throw dbError;
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }

            stats.succeeded++;
            console.log(`${LOG_TAG} ✅ Batch ${i + 1}/${iterations}: Added ${uniqueQuestions.length} Qs`);

        } catch (error) {
            stats.failed++;
            stats.errors.push(error.message);
            console.error(`${LOG_TAG} ❌ Batch ${i + 1} Failed:`, error.message);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    console.log(`${LOG_TAG} 📊 DONE: +${stats.questionsAdded} questions`);
    return existingQuestions.length;
}

// ... sampleQuestionsForUser remains exactly the same ...
export async function sampleQuestionsForUser({ userId, domainId, difficulty }) {
    const poolKey = `${domainId}:${difficulty}`;
    const pool = await db.rAGOutput.findUnique({
        where: { taskType_taskKey: { taskType: "question_pool", taskKey: poolKey } },
    });

    if (!pool || pool.questionCount === 0) throw new Error("POOL_NOT_READY");

    const history = await db.userQuestionHistory.findMany({
        where: { userId, domainId },
        select: { questionId: true, embedding: true },
    });

    const seenIds = new Set(history.map((h) => h.questionId));
    const seenEmbeddings = history.map((h) => h.embedding);

    const available = pool.content.questions.filter((q) => {
        const questionId = crypto.createHash("md5").update(q.question).digest("hex").slice(0, 16);
        if (seenIds.has(questionId)) return false;
        for (const seenEmb of seenEmbeddings) {
            if (cosineSimilarity(q.embedding, seenEmb) > RAG_CONFIG.SEMANTIC_SIMILARITY_THRESHOLD) {
                return false;
            }
        }
        return true;
    });

    if (available.length < RAG_CONFIG.QUESTIONS_PER_QUIZ) throw new Error("POOL_EXHAUSTED");

    const shuffled = available.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, RAG_CONFIG.QUESTIONS_PER_QUIZ);

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