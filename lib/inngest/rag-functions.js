// import { inngest } from "./client";
// import { generateQuestionPool } from "@/lib/rag/question-pool";
// import { retrieveContext } from "@/lib/rag/core";

// export const generateQuestionPoolJob = inngest.createFunction(
//     {
//         id: "generate-question-pool",
//         concurrency: {
//             limit: 3,
//             key: "event.data.poolKey",
//         },
//         retries: 2,
//     },
//     { event: "quiz/generate-pool" },
//     async ({ event, step }) => {
//         const { domainId, difficulty, skills } = event.data;

//         const context = await step.run("Retrieve context", async () => {
//             return await retrieveContext({ taskType: "quiz", domainId });
//         });

//         if (!context) {
//             throw new Error("No context available");
//         }

//         const questions = await step.run("Generate pool", async () => {
//             return await generateQuestionPool({
//                 domainId,
//                 difficulty,
//                 skills,
//                 context,
//             });
//         });

//         return { success: true, questionCount: questions.length };
//     }
// );