// lib/inngest/rag-functions.js
import { inngest } from "./client";
import { generateRAGOutput } from "@/lib/rag/core";

export const generateRAGTask = inngest.createFunction(
    {
        id: "rag-generate-task",
        concurrency: {
            limit: 3, // Max 3 concurrent LLM calls
            key: "event.data.taskKey" // Deduplicate per unique task
        },
        retries: 2
    },
    { event: "rag/generate" },
    async ({ event, step }) => {
        const { taskType, taskKey, domainId, userId, taskParams } = event.data;

        // Generate output (function is idempotent)
        const output = await step.run("Generate RAG output", async () => {
            return await generateRAGOutput({
                taskType,
                taskKey,
                domainId,
                taskParams
            });
        });

        return { success: true, taskKey, output };
    }
)