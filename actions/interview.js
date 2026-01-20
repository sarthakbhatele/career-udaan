// "use server";

// import { getActiveDomain } from "@/lib/getActiveDomain";
// import { inngest } from "@/lib/inngest/client";
// import { db } from "@/lib/prisma";
// import { auth } from "@clerk/nextjs/server";
// import { GoogleGenerativeAI } from "@google/generative-ai";

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// export async function generateQuiz() {
//   const domain = await getActiveDomain();

//   // Unique cache key per domain + difficulty (extendable later)
//   const taskKey = `${domain.id}:basic`;

//   // 1️⃣ DB-first read (cache)
//   const cached = await db.rAGOutput.findUnique({
//     where: {
//       taskType_taskKey: {
//         taskType: "quiz",
//         taskKey,
//       },
//     },
//   });

//   if (
//     cached &&
//     (!cached.expiresAt || cached.expiresAt > new Date())
//   ) {
//     return cached.content.questions;
//   }

//   // 2️⃣ Trigger background generation (NON-blocking)
//   await inngest.send({
//     name: "rag/generate",
//     data: {
//       taskType: "quiz",
//       taskKey,
//       domainId: domain.id,
//       taskParams: {
//         questionCount: 10,
//         difficulty: "basic",
//         skills: domain.skills ?? [],
//         industry: domain.industry,
//       },
//     },
//   });

//   // 3️⃣ Immediate safe response (UI shows loader/skeleton)
//   return {
//     generating: true,
//     message: "Quiz is being generated. Please refresh shortly.",
//   };
// }

// import { sampleQuestionsForUser, generateQuestionPool } from "@/lib/rag/question-pool";
// import { inngest } from "@/lib/inngest/client";
// import { getActiveDomain } from "@/lib/getActiveDomain";
// import { db } from "@/lib/prisma";
// import { auth } from "@clerk/nextjs/server";
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { retrieveContext } from "@/lib/rag/core";

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// export async function generateQuiz(difficulty = "medium") {
//   const { userId } = await auth();
//   const user = await db.user.findUnique({ where: { clerkUserId: userId } });
//   const domain = await getActiveDomain();

//   // Check if pool exists
//   const pool = await db.rAGOutput.findUnique({
//     where: {
//       taskType_taskKey: {
//         taskType: "question_pool",
//         taskKey: `${domain.id}:${difficulty}`,
//       },
//     },
//   });

//   // If pool doesn't exist or expired, trigger generation
//   if (!pool || (pool.expiresAt && pool.expiresAt < new Date())) {
//     await inngest.send({
//       name: "quiz/generate-pool",
//       data: {
//         poolKey: `${domain.id}:${difficulty}`,
//         domainId: domain.id,
//         difficulty,
//         skills: domain.skills || [],
//       },
//     });

//     return {
//       generating: true,
//       message: "Building question pool. Refresh in 30 seconds.",
//     };
//   }

//   // Sample unseen questions
//   const questions = await sampleQuestionsForUser({
//     userId: user.id,
//     domainId: domain.id,
//     difficulty,
//     count: 10,
//   });

//   if (questions.length < 10) {
//     return {
//       generating: true,
//       message: "Expanding question pool for more variety. Try again shortly.",
//     };
//   }

//   return questions;
// }


"use server";

import { sampleQuestionsForUser } from "@/lib/rag/question-pool";
import { checkDailyQuizLimit, recordQuizAttempt } from "@/lib/rag/quiz-limits";
import { inngest } from "@/lib/inngest/client";
import { getActiveDomain } from "@/lib/getActiveDomain";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function generateQuiz(difficulty = "medium") {
  const { userId } = await auth();
  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  const domain = await getActiveDomain();

  // 1. Check daily limit
  const limitCheck = await checkDailyQuizLimit(user.id);

  if (!limitCheck.canAttempt) {
    return {
      error: true,
      message: `Daily limit reached (${limitCheck.limit} quizzes/day). Try again tomorrow.`,
      attemptsToday: limitCheck.attemptsToday,
      remaining: 0,
    };
  }

  // 2. Try to sample questions
  try {
    const questions = await sampleQuestionsForUser({
      userId: user.id,
      domainId: domain.id,
      difficulty,
    });

    await recordQuizAttempt(user.id, domain.id);

    // ✅ CHANGED: Always return consistent shape
    return {
      questions,
      remaining: limitCheck.remaining - 1, // -1 because we just recorded attempt
    };
  } catch (error) {
    if (error.message === "POOL_NOT_READY" || error.message === "POOL_EXHAUSTED") {
      await inngest.send({
        name: "quiz/expand-pool",
        data: {
          poolKey: `${domain.id}:${difficulty}`,
          domainId: domain.id,
          difficulty,
          skills: domain.skills || [],
          urgent: true,
        },
      });

      return {
        generating: true,
        message: "Building question pool. This takes 30-60 seconds.",
        remaining: limitCheck.remaining,
      };
    }

    throw error;
  }
}

// saveQuizResult remains unchanged
// getAssessments remains unchanged

export async function saveQuizResult(questions, answers, score) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const domain = await getActiveDomain();

  const questionResults = questions.map((q, index) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[index] || "Not attempted", // Handle null answers
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));

  // Get wrong answers
  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  // Only generate improvement tips if there are wrong answers AND quiz wasn't abandoned
  let improvementTip = null;
  const wasAbandoned = answers.every(a => a === null);

  if (wrongAnswers.length > 0 && !wasAbandoned) {
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
      )
      .join("\n\n");

    const improvementPrompt = `
      The user got the following ${domain.industry} technical interview questions wrong:

      ${wrongQuestionsText}

      Based on these mistakes, provide a concise, specific improvement tip.
      Focus on the knowledge gaps revealed by these wrong answers.
      Keep the response under 2 sentences and make it encouraging.
      Don't explicitly mention the mistakes, instead focus on what to learn/practice.
    `;

    try {
      const tipResult = await model.generateContent(improvementPrompt);
      improvementTip = tipResult.response.text().trim();
      console.log(improvementTip);
    } catch (error) {
      console.error("Error generating improvement tip:", error);
    }
  }

  try {
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        quizScore: score,
        questions: questionResults,
        category: "Technical",
        improvementTip,
      },
    });

    return assessment;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}

export async function getAssessments() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const assessments = await db.assessment.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return assessments;
  } catch (error) {
    console.error("Error fetching assessments:", error);
    throw new Error("Failed to fetch assessments");
  }
}
