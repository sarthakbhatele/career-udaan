// import { inngest } from "./client";
// import { expandQuestionPool } from "@/lib/rag/question-pool";
// import { retrieveContext } from "@/lib/rag/core";
// import { db } from "@/lib/prisma";
// import { RAG_CONFIG } from "@/lib/rag/config";

// /**
//  * CRON: Nightly pool expansion
//  * Runs at 2 AM daily
//  */
// export const expandAllPools = inngest.createFunction(
//     {
//         id: "expand-all-question-pools",
//         concurrency: { limit: 1 },
//     },
//     { cron: "0 2 * * *" }, // 2 AM daily
//     async ({ step }) => {
//         // Get all active domains
//         // NOTE: Using distinct by industry = shared pool per industry
//         // Skills only guide question diversity, not isolation
//         const domains = await step.run("Fetch active domains", async () => {
//             return await db.userDomain.findMany({
//                 select: { id: true, industry: true, skills: true },
//                 distinct: ["industry"], // ✅ ACCEPTABLE for Phase 5.2
//             });
//         });

//         const difficulties = ["easy", "medium", "hard"];
//         const results = [];

//         for (const domain of domains) {
//             for (const difficulty of difficulties) {
//                 const result = await step.run(`Expand ${domain.industry}:${difficulty}`, async () => {
//                     const poolKey = `${domain.id}:${difficulty}`;

//                     // Check current pool size
//                     const pool = await db.rAGOutput.findUnique({
//                         where: {
//                             taskType_taskKey: {
//                                 taskType: "question_pool",
//                                 taskKey: poolKey,
//                             },
//                         },
//                     });

//                     const currentSize = pool?.questionCount || 0;

//                     // Only expand if below target
//                     if (currentSize >= RAG_CONFIG.TARGET_POOL_SIZE) {
//                         return { poolKey, skipped: true, currentSize };
//                     }

//                     // Get context
//                     const context = await retrieveContext({
//                         taskType: "quiz",
//                         domainId: domain.id,
//                     });

//                     if (!context) {
//                         return { poolKey, error: "No context available" };
//                     }

//                     // Expand pool
//                     const newSize = await expandQuestionPool({
//                         domainId: domain.id,
//                         difficulty,
//                         skills: domain.skills || [],
//                         context,
//                     });

//                     return { poolKey, expanded: true, newSize };
//                 });

//                 results.push(result);
//             }
//         }

//         return { processed: results.length, results };
//     }
// );

// /**
//  * EVENT: Emergency pool expansion
//  * Triggered when user hits empty pool
//  */
// export const emergencyExpand = inngest.createFunction(
//     {
//         id: "emergency-expand-pool",
//         concurrency: {
//             limit: 3,
//             key: "event.data.poolKey",
//         },
//         retries: 3, // Increased from 2
//         onFailure: async ({ error, event }) => {
//             console.error(`Pool expansion failed after retries:`, {
//                 poolKey: event.data.poolKey,
//                 error: error.message
//             });

//             // Log to monitoring/alerts if needed
//         }
//     },
//     { event: "quiz/expand-pool" },
//     async ({ event, step }) => {
//         const { poolKey, domainId, difficulty, skills, urgent } = event.data;

//         const context = await step.run("Retrieve context", async () => {
//             return await retrieveContext({ taskType: "quiz", domainId });
//         });

//         if (!context) {
//             throw new Error("No context available");
//         }

//         const newSize = await step.run("Expand pool", async () => {
//             try {
//                 return await expandQuestionPool({
//                     domainId,
//                     difficulty,
//                     skills,
//                     context,
//                 });
//             } catch (error) {
//                 // Add delay for network errors before retry
//                 if (error.message?.includes("NETWORK_ERROR")) {
//                     await new Promise(resolve => setTimeout(resolve, 2000));
//                 }
//                 throw error;
//             }
//         });

//         return { success: true, poolKey, newSize, urgent };
//     }
// );


// // v5.4
// import { inngest } from "./client";
// import { expandQuestionPool } from "@/lib/rag/question-pool";
// import { retrieveContext } from "@/lib/rag/core";
// import { db } from "@/lib/prisma";
// import { RAG_CONFIG } from "@/lib/rag/config";

// /**
//  * CRON: Nightly pool expansion with macro batch limiting
//  * Runs at 2 AM daily
//  */
// export const expandAllPools = inngest.createFunction(
//     {
//         id: "expand-all-question-pools",
//         concurrency: { limit: 1 },
//         retries: 0, // Handle errors internally
//     },
//     { cron: "0 2 * * *" },
//     async ({ step }) => {
//         const domains = await step.run("Fetch active domains", async () => {
//             return await db.userDomain.findMany({
//                 select: { id: true, industry: true, skills: true },
//                 distinct: ["industry"],
//             });
//         });

//         const difficulties = ["easy", "medium", "hard"];
//         const results = [];

//         for (const domain of domains) {
//             for (const difficulty of difficulties) {
//                 const result = await step.run(`Expand ${domain.industry}:${difficulty}`, async () => {
//                     const poolKey = `${domain.id}:${difficulty}`;

//                     // Get current pool
//                     const pool = await db.rAGOutput.findUnique({
//                         where: {
//                             taskType_taskKey: {
//                                 taskType: "question_pool",
//                                 taskKey: poolKey,
//                             },
//                         },
//                     });

//                     const currentSize = pool?.questionCount || 0;
//                     const needed = RAG_CONFIG.TARGET_POOL_SIZE - currentSize;

//                     // Skip if already at target
//                     if (needed <= 0) {
//                         return { poolKey, skipped: true, currentSize, reason: "Target reached" };
//                     }

//                     // Cap at macro batch size (two-level batching)
//                     const toGenerate = Math.min(needed, RAG_CONFIG.MACRO_BATCH_SIZE);

//                     console.log(`📦 ${poolKey}: Current ${currentSize}, Needed ${needed}, Generating ${toGenerate}`);

//                     // Get context
//                     const context = await retrieveContext({
//                         taskType: "quiz",
//                         domainId: domain.id,
//                     });

//                     if (!context) {
//                         return { poolKey, error: "No context available" };
//                     }

//                     // Expand with macro batch limit
//                     const newSize = await expandQuestionPool({
//                         domainId: domain.id,
//                         difficulty,
//                         skills: domain.skills || [],
//                         context,
//                         maxQuestions: toGenerate, // ✅ Macro batch limit
//                     });

//                     return {
//                         poolKey,
//                         expanded: true,
//                         previousSize: currentSize,
//                         newSize,
//                         generated: newSize - currentSize
//                     };
//                 });

//                 results.push(result);

//                 // Wait between domains to avoid rate limits
//                 await step.sleep("domain-delay", 2000);
//             }
//         }

//         return {
//             processed: results.length,
//             results,
//             summary: {
//                 expanded: results.filter(r => r.expanded).length,
//                 skipped: results.filter(r => r.skipped).length,
//                 errors: results.filter(r => r.error).length,
//             }
//         };
//     }
// );

// /**
//  * EVENT: Emergency pool expansion - generate minimal batch only
//  * Triggered when user hits empty pool
//  */
// export const emergencyExpand = inngest.createFunction(
//     {
//         id: "emergency-expand-pool",
//         concurrency: {
//             limit: 3,
//             key: "event.data.poolKey",
//         },
//         retries: 2,
//         onFailure: async ({ error, event }) => {
//             console.error(`Emergency pool expansion failed:`, {
//                 poolKey: event.data.poolKey,
//                 error: error.message
//             });
//         }
//     },
//     { event: "quiz/expand-pool" },
//     async ({ event, step }) => {
//         const { poolKey, domainId, difficulty, skills } = event.data;

//         const context = await step.run("Retrieve context", async () => {
//             return await retrieveContext({ taskType: "quiz", domainId });
//         });

//         if (!context) {
//             throw new Error("No context available");
//         }

//         const newSize = await step.run("Generate emergency batch", async () => {
//             return await expandQuestionPool({
//                 domainId,
//                 difficulty,
//                 skills,
//                 context,
//                 maxQuestions: RAG_CONFIG.EMERGENCY_BATCH_SIZE, // ✅ Single mini-batch (40 questions)
//             });
//         });

//         return { success: true, poolKey, newSize };
//     }
// );

// v open ai seq
// import { inngest } from "./client";
// import { expandQuestionPool } from "@/lib/rag/question-pool";
// import { retrieveContext } from "@/lib/rag/core";
// import { db } from "@/lib/prisma";
// import { RAG_CONFIG } from "@/lib/rag/config";

// /**
//  * CRON: Nightly pool expansion with macro batch limiting
//  * Runs at 2 AM daily
//  */
// export const expandAllPools = inngest.createFunction(
//     {
//         id: "expand-all-question-pools",
//         concurrency: { limit: 1 },
//         retries: 0,
//     },
//     { cron: "0 2 * * *" },
//     async ({ step }) => {
//         console.log(`\n🌙 ============ NIGHTLY POOL EXPANSION STARTED ============`);
//         console.log(`⏰ Time: ${new Date().toISOString()}`);
//         console.log(`🎯 Macro batch size: ${RAG_CONFIG.MACRO_BATCH_SIZE} questions/domain`);
//         console.log(`🔧 Mini batch size: ${RAG_CONFIG.MINI_BATCH_SIZE} questions/call`);
//         console.log(`=======================================================\n`);

//         const domains = await step.run("Fetch active domains", async () => {
//             return await db.userDomain.findMany({
//                 select: { id: true, industry: true, skills: true },
//                 distinct: ["industry"],
//             });
//         });

//         console.log(`📦 Found ${domains.length} unique industries to process`);

//         const difficulties = ["easy", "medium", "hard"];
//         const results = [];
//         let totalApiRequests = 0;

//         for (const domain of domains) {
//             for (const difficulty of difficulties) {
//                 const result = await step.run(`Expand ${domain.industry}:${difficulty}`, async () => {
//                     const poolKey = `${domain.id}:${difficulty}`;

//                     const pool = await db.rAGOutput.findUnique({
//                         where: {
//                             taskType_taskKey: {
//                                 taskType: "question_pool",
//                                 taskKey: poolKey,
//                             },
//                         },
//                     });

//                     const currentSize = pool?.questionCount || 0;
//                     const needed = RAG_CONFIG.TARGET_POOL_SIZE - currentSize;

//                     if (needed <= 0) {
//                         console.log(`✓ ${poolKey}: Already at target (${currentSize}/${RAG_CONFIG.TARGET_POOL_SIZE})`);
//                         return { poolKey, skipped: true, currentSize, reason: "Target reached" };
//                     }

//                     const toGenerate = Math.min(needed, RAG_CONFIG.MACRO_BATCH_SIZE);
//                     const expectedApiCalls = Math.ceil(toGenerate / RAG_CONFIG.MINI_BATCH_SIZE);

//                     console.log(`\n📊 ${poolKey}`);
//                     console.log(`   Current: ${currentSize}/${RAG_CONFIG.TARGET_POOL_SIZE}`);
//                     console.log(`   Needed: ${needed}`);
//                     console.log(`   Generating: ${toGenerate} (${expectedApiCalls} API calls)`);

//                     const context = await retrieveContext({
//                         taskType: "quiz",
//                         domainId: domain.id,
//                     });

//                     if (!context) {
//                         console.error(`❌ ${poolKey}: No context available`);
//                         return { poolKey, error: "No context available" };
//                     }

//                     try {
//                         const newSize = await expandQuestionPool({
//                             domainId: domain.id,
//                             difficulty,
//                             skills: domain.skills || [],
//                             context,
//                             maxQuestions: toGenerate,
//                         });

//                         const generated = newSize - currentSize;
//                         totalApiRequests += expectedApiCalls;

//                         return {
//                             poolKey,
//                             expanded: true,
//                             previousSize: currentSize,
//                             newSize,
//                             generated,
//                             expectedApiCalls
//                         };
//                     } catch (error) {
//                         console.error(`❌ ${poolKey}: Expansion failed -`, error.message);
//                         return { poolKey, error: error.message };
//                     }
//                 });

//                 results.push(result);

//                 // Wait between pools
//                 await step.sleep("pool-delay", 2000);
//             }
//         }

//         // Final summary
//         const summary = {
//             expanded: results.filter(r => r.expanded).length,
//             skipped: results.filter(r => r.skipped).length,
//             errors: results.filter(r => r.error).length,
//             totalGenerated: results.reduce((sum, r) => sum + (r.generated || 0), 0),
//             estimatedApiCalls: totalApiRequests
//         };

//         console.log(`\n🎉 ============ CRON EXPANSION COMPLETE ============`);
//         console.log(`✨ Pools expanded: ${summary.expanded}`);
//         console.log(`✓ Pools skipped: ${summary.skipped}`);
//         console.log(`❌ Pools failed: ${summary.errors}`);
//         console.log(`📈 Total questions added: ${summary.totalGenerated}`);
//         console.log(`📡 Estimated API calls: ${summary.estimatedApiCalls}`);
//         console.log(`=================================================\n`);

//         return {
//             processed: results.length,
//             results,
//             summary
//         };
//     }
// );

// /**
//  * EVENT: Emergency pool expansion - generate minimal batch only
//  */
// export const emergencyExpand = inngest.createFunction(
//     {
//         id: "emergency-expand-pool",
//         concurrency: {
//             limit: 3,
//             key: "event.data.poolKey",
//         },
//         retries: 2,
//         onFailure: async ({ error, event }) => {
//             console.error(`🚨 Emergency expansion failed for ${event.data.poolKey}:`, error.message);
//         }
//     },
//     { event: "quiz/expand-pool" },
//     async ({ event, step }) => {
//         const { poolKey, domainId, difficulty, skills } = event.data;

//         console.log(`🚨 Emergency expansion triggered for ${poolKey}`);

//         const context = await step.run("Retrieve context", async () => {
//             return await retrieveContext({ taskType: "quiz", domainId });
//         });

//         if (!context) {
//             throw new Error("No context available");
//         }

//         const newSize = await step.run("Generate emergency batch", async () => {
//             return await expandQuestionPool({
//                 domainId,
//                 difficulty,
//                 skills,
//                 context,
//                 maxQuestions: RAG_CONFIG.EMERGENCY_BATCH_SIZE,
//             });
//         });

//         console.log(`✅ Emergency expansion complete: ${poolKey} now has ${newSize} questions`);

//         return { success: true, poolKey, newSize };
//     }
// );


// v open ai parallel
import { inngest } from "./client";
import { expandQuestionPool } from "@/lib/rag/question-pool";
import { retrieveContext } from "@/lib/rag/core";
import { db } from "@/lib/prisma";
import { RAG_CONFIG } from "@/lib/rag/config";

/**
 * CRON: Nightly pool expansion
 * STRATEGY: Sequential Domains (Safe) + Parallel Difficulties (Fast)
 */
export const expandAllPools = inngest.createFunction(
    {
        id: "expand-all-question-pools",
        concurrency: { limit: 1 }, // Only 1 cron job runs at a time
        retries: 0,
    },
    { cron: "0 2 * * *" },
    async ({ step }) => {
        console.log(`\n🌙 ============ NIGHTLY POOL EXPANSION STARTED ============`);
        console.log(`🎯 Model: GPT-4o-Mini | Batch Size: ${RAG_CONFIG.MINI_BATCH_SIZE}`);
        
        const domains = await step.run("Fetch active domains", async () => {
            return await db.userDomain.findMany({
                select: { id: true, industry: true, skills: true },
                distinct: ["industry"],
            });
        });

        const difficulties = ["easy", "medium", "hard"];
        const results = [];

        // SEQUENTIAL DOMAINS
        // We process one domain at a time to prevent database locking issues
        for (const domain of domains) {
            
            // Run "Expand Domain" step which internally runs difficulties in PARALLEL
            const domainResults = await step.run(`Expand Domain: ${domain.industry}`, async () => {
                
                // 1. Get Context ONCE for the whole domain
                const context = await retrieveContext({
                    taskType: "quiz",
                    domainId: domain.id,
                });

                if (!context) return [{ error: "No context available" }];

                // 2. PARALLEL DIFFICULTIES (The Speed Boost 🚀)
                // We fire Easy, Medium, and Hard requests simultaneously
                const difficultyPromises = difficulties.map(async (difficulty) => {
                    const poolKey = `${domain.id}:${difficulty}`;
                    try {
                        const pool = await db.rAGOutput.findUnique({
                            where: {
                                taskType_taskKey: {
                                    taskType: "question_pool",
                                    taskKey: poolKey,
                                },
                            },
                        });

                        const currentSize = pool?.questionCount || 0;
                        const needed = RAG_CONFIG.TARGET_POOL_SIZE - currentSize;

                        if (needed <= 0) {
                            return { poolKey, skipped: true, reason: "Target reached" };
                        }

                        // Cap at macro batch size (e.g., generate max 100 per run)
                        const toGenerate = Math.min(needed, RAG_CONFIG.MACRO_BATCH_SIZE);
                        const expectedApiCalls = Math.ceil(toGenerate / RAG_CONFIG.MINI_BATCH_SIZE);

                        console.log(`🚀 Starting ${poolKey} (Need ${toGenerate})`);

                        const newSize = await expandQuestionPool({
                            domainId: domain.id,
                            difficulty,
                            skills: domain.skills || [],
                            context,
                            maxQuestions: toGenerate,
                        });

                        return {
                            poolKey,
                            expanded: true,
                            generated: newSize - currentSize,
                            expectedApiCalls
                        };

                    } catch (error) {
                        console.error(`❌ ${poolKey} Failed:`, error.message);
                        return { poolKey, error: error.message };
                    }
                });

                // Wait for Easy, Medium, and Hard to all finish before moving to next domain
                return await Promise.all(difficultyPromises);
            });

            if (domainResults) results.push(...domainResults);

            // Short breather between domains
            await step.sleep("domain-delay", "2s");
        }

        // Calculate Summary
        const flatResults = results.flat();
        const summary = {
            processed: flatResults.length,
            generated: flatResults.reduce((sum, r) => sum + (r.generated || 0), 0),
            errors: flatResults.filter(r => r.error).length
        };

        console.log(`\n🎉 CRON COMPLETE: Added ${summary.generated} questions across ${summary.processed} pools.`);
        
        return { 
            summary, 
            results: flatResults 
        };
    }
);

// ... emergencyExpand remains exactly the same as before ...
export const emergencyExpand = inngest.createFunction(
    {
        id: "emergency-expand-pool",
        concurrency: {
            limit: 3,
            key: "event.data.poolKey",
        },
        retries: 2,
        onFailure: async ({ error, event }) => {
            console.error(`🚨 Emergency expansion failed for ${event.data.poolKey}:`, error.message);
        }
    },
    { event: "quiz/expand-pool" },
    async ({ event, step }) => {
        const { poolKey, domainId, difficulty, skills } = event.data;
        
        const context = await step.run("Retrieve context", async () => {
            return await retrieveContext({ taskType: "quiz", domainId });
        });
        
        if (!context) throw new Error("No context available");

        const newSize = await step.run("Generate emergency batch", async () => {
            return await expandQuestionPool({
                domainId,
                difficulty,
                skills,
                context,
                maxQuestions: RAG_CONFIG.EMERGENCY_BATCH_SIZE,
            });
        });
        
        return { success: true, poolKey, newSize };
    }
);