// lib/inngest/context-seeding.js
import { db } from "../prisma";
import { inngest } from "./client";
import { generateEmbedding } from "@/lib/rag/core";

export const seedContextChunks = inngest.createFunction(
    {
        id: "seed-context-chunks",
        concurrency: { limit: 1 }
    },
    { event: "context/seed" }, // Weekly refresh (Sunday 2 AM)
    async ({ step }) => {
        const insights = await step.run("Fetch all insights", async () => {
            return await db.industryInsight.findMany({
                where: { generationStatus: "completed" }
            });
        });

        for (const insight of insights) {
            await step.run(`Process ${insight.industry}`, async () => {
                const content = `
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

                const embedding = await generateEmbedding(content);

                await db.contextChunk.upsert({
                    where: {
                        sourceType_sourceId: {
                            sourceType: "industry_insight",
                            sourceId: insight.id
                        }
                    },
                    create: {
                        sourceType: "industry_insight",
                        sourceId: insight.id,
                        content,
                        embedding,
                        metadata: { industry: insight.industry }
                    },
                    update: {
                        content,
                        embedding
                    }
                });
            });
        }

        return { processed: insights.length };
    }
);