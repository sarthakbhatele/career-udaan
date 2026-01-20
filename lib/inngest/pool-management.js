import { inngest } from "./client";
import { expandQuestionPool } from "@/lib/rag/question-pool";
import { retrieveContext } from "@/lib/rag/core";
import { db } from "@/lib/prisma";
import { RAG_CONFIG } from "@/lib/rag/config";

/**
 * CRON: Nightly pool expansion
 * Runs at 2 AM daily
 */
export const expandAllPools = inngest.createFunction(
    {
        id: "expand-all-question-pools",
        concurrency: { limit: 1 },
    },
    { cron: "0 2 * * *" }, // 2 AM daily
    async ({ step }) => {
        // Get all active domains
        // NOTE: Using distinct by industry = shared pool per industry
        // Skills only guide question diversity, not isolation
        const domains = await step.run("Fetch active domains", async () => {
            return await db.userDomain.findMany({
                select: { id: true, industry: true, skills: true },
                distinct: ["industry"], // ✅ ACCEPTABLE for Phase 5.2
            });
        });

        const difficulties = ["easy", "medium", "hard"];
        const results = [];

        for (const domain of domains) {
            for (const difficulty of difficulties) {
                const result = await step.run(`Expand ${domain.industry}:${difficulty}`, async () => {
                    const poolKey = `${domain.id}:${difficulty}`;

                    // Check current pool size
                    const pool = await db.rAGOutput.findUnique({
                        where: {
                            taskType_taskKey: {
                                taskType: "question_pool",
                                taskKey: poolKey,
                            },
                        },
                    });

                    const currentSize = pool?.questionCount || 0;

                    // Only expand if below target
                    if (currentSize >= RAG_CONFIG.TARGET_POOL_SIZE) {
                        return { poolKey, skipped: true, currentSize };
                    }

                    // Get context
                    const context = await retrieveContext({
                        taskType: "quiz",
                        domainId: domain.id,
                    });

                    if (!context) {
                        return { poolKey, error: "No context available" };
                    }

                    // Expand pool
                    const newSize = await expandQuestionPool({
                        domainId: domain.id,
                        difficulty,
                        skills: domain.skills || [],
                        context,
                    });

                    return { poolKey, expanded: true, newSize };
                });

                results.push(result);
            }
        }

        return { processed: results.length, results };
    }
);

/**
 * EVENT: Emergency pool expansion
 * Triggered when user hits empty pool
 */
export const emergencyExpand = inngest.createFunction(
    {
        id: "emergency-expand-pool",
        concurrency: {
            limit: 3,
            key: "event.data.poolKey",
        },
        retries: 2,
    },
    { event: "quiz/expand-pool" },
    async ({ event, step }) => {
        const { poolKey, domainId, difficulty, skills, urgent } = event.data;

        const context = await step.run("Retrieve context", async () => {
            return await retrieveContext({ taskType: "quiz", domainId });
        });

        if (!context) {
            throw new Error("No context available");
        }

        const newSize = await step.run("Expand pool", async () => {
            return await expandQuestionPool({
                domainId,
                difficulty,
                skills,
                context,
            });
        });

        return { success: true, poolKey, newSize, urgent };
    }
);