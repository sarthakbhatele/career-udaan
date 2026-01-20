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
import crypto from "crypto";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// export async function generateQuiz(difficulty = "medium") {
//   const { userId } = await auth();
//   const user = await db.user.findUnique({ where: { clerkUserId: userId } });
//   const domain = await getActiveDomain();

//   // 1. Check daily limit
//   const limitCheck = await checkDailyQuizLimit(user.id);

//   if (!limitCheck.canAttempt) {
//     return {
//       error: true,
//       message: `Daily limit reached (${limitCheck.limit} quizzes/day). Try again tomorrow.`,
//       attemptsToday: limitCheck.attemptsToday,
//       remaining: 0,
//     };
//   }

//   // 2. Try to sample questions
//   try {
//     const questions = await sampleQuestionsForUser({
//       userId: user.id,
//       domainId: domain.id,
//       difficulty,
//     });

//     await recordQuizAttempt(user.id, domain.id);

//     // ✅ CHANGED: Always return consistent shape
//     return {
//       questions,
//       remaining: limitCheck.remaining - 1, // -1 because we just recorded attempt
//     };
//   } catch (error) {
//     if (error.message === "POOL_NOT_READY" || error.message === "POOL_EXHAUSTED") {
//       await inngest.send({
//         name: "quiz/expand-pool",
//         data: {
//           poolKey: `${domain.id}:${difficulty}`,
//           domainId: domain.id,
//           difficulty,
//           skills: domain.skills || [],
//           urgent: true,
//         },
//       });

//       return {
//         generating: true,
//         message: "Building question pool. This takes 30-60 seconds.",
//         remaining: limitCheck.remaining,
//       };
//     }

//     throw error;
//   }
// }

export async function generateQuiz(difficulty = "medium") {
  const { userId } = await auth();
  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  const domain = await getActiveDomain();

  const limitCheck = await checkDailyQuizLimit(user.id);

  if (!limitCheck.canAttempt) {
    return {
      error: true,
      message: `Daily limit reached (${limitCheck.limit} quizzes/day). Try again tomorrow.`,
      attemptsToday: limitCheck.attemptsToday,
      remaining: 0,
    };
  }

  try {
    const questions = await sampleQuestionsForUser({
      userId: user.id,
      domainId: domain.id,
      difficulty,
    });

    await recordQuizAttempt(user.id, domain.id);

    return {
      questions,
      remaining: limitCheck.remaining - 1,
    };
  } catch (error) {
    if (error.message === "POOL_NOT_READY" || error.message === "POOL_EXHAUSTED") {
      // Trigger expansion
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
        message: "Building question pool. This takes 30-60 seconds. Please refresh or try again shortly.",
        remaining: limitCheck.remaining,
      };
    }

    // Log unexpected errors
    console.error("Unexpected quiz generation error:", error);

    return {
      error: true,
      message: "Failed to generate quiz. Please try again in a moment.",
      remaining: limitCheck.remaining,
    };
  }
}
/**
 * Generate custom topic-focused quiz
 */
export async function generateCustomQuiz(topic) {
  const { userId } = await auth();
  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  const domain = await getActiveDomain();

  // 1. Check daily limit for custom quizzes
  const limitCheck = await checkDailyQuizLimit(user.id, "custom");

  if (!limitCheck.canAttempt) {
    return {
      error: true,
      message: `Daily custom quiz limit reached (${limitCheck.limit} quizzes/day). Try again tomorrow.`,
      attemptsToday: limitCheck.attemptsToday,
      remaining: 0,
    };
  }

  // 2. Generate topic-focused questions (20 questions)
  const prompt = `You are an expert interviewer. Generate 20 interview questions focused on: ${topic}

CONTEXT:
Industry: ${domain.industry}
User Skills: ${domain.skills?.join(", ") || "General"}

CRITICAL RULES:
1. ALL 20 questions must be about: ${topic}
2. Questions must test practical knowledge, not trivia
3. Mix difficulty levels (easy, medium, hard)
4. Each question must be unique and test different aspects
5. Focus on real-world application

OUTPUT FORMAT (strict JSON, no markdown):
{
  "questions": [
    {
      "question": "Clear, scenario-based question about ${topic}",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "A) ..." (must match exactly),
      "explanation": "Why this answer is correct",
      "skill": "${topic}",
      "difficulty": "easy|medium|hard"
    }
  ]
}

Generate exactly 20 diverse questions about ${topic}.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```(?:json)?\n?/g, "").trim();
    const parsed = JSON.parse(text);

    // 3. Check for duplicates against user history
    const history = await db.userQuestionHistory.findMany({
      where: { userId: user.id, domainId: domain.id },
      select: { questionId: true },
    });

    const seenIds = new Set(history.map((h) => h.questionId));

    // Filter out seen questions
    const unseenQuestions = parsed.questions.filter((q) => {
      const questionId = crypto.createHash("md5").update(q.question).digest("hex").slice(0, 16);
      return !seenIds.has(questionId);
    });

    if (unseenQuestions.length < 20) {
      // If we don't have enough unseen questions, just use what we have
      console.warn(`Only ${unseenQuestions.length}/20 unseen questions for topic: ${topic}`);
    }

    const finalQuestions = unseenQuestions.slice(0, 20);

    // 4. Record attempt
    await recordQuizAttempt(user.id, domain.id, "custom", topic);

    return {
      questions: finalQuestions,
      topic,
      remaining: limitCheck.remaining - 1,
    };
  } catch (error) {
    console.error("Error generating custom quiz:", error);
    throw new Error("Failed to generate custom quiz");
  }
}

// Update getAssessments to support quiz type filtering
export async function getAssessments(quizType = null) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const where = { userId: user.id };
    if (quizType) {
      where.quizType = quizType;
    }

    const assessments = await db.assessment.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    return assessments;
  } catch (error) {
    console.error("Error fetching assessments:", error);
    throw new Error("Failed to fetch assessments");
  }
}

// Update saveQuizResult to support quiz type and topic
export async function saveQuizResult(questions, answers, score, quizType = "standard", topic = null) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const domain = await getActiveDomain();

  // Check if user has seen each question before
  const questionResults = await Promise.all(
    questions.map(async (q, index) => {
      const questionId = crypto.createHash("md5").update(q.question).digest("hex").slice(0, 16);

      const seenBefore = await db.userQuestionHistory.findUnique({
        where: {
          userId_questionId: {
            userId: user.id,
            questionId
          }
        }
      });

      return {
        question: q.question,
        answer: q.correctAnswer,
        userAnswer: answers[index] || "Not attempted",
        isCorrect: q.correctAnswer === answers[index],
        explanation: q.explanation,
        seenBefore: !!seenBefore,
      };
    })
  );

  // Get wrong answers
  const wrongAnswers = questionResults.filter((q) => !q.isCorrect && q.userAnswer !== "Not attempted");
  const wasAbandoned = answers.every(a => a === null);

  // Generate improvement tip if needed
  let improvementTip = null;
  if (wrongAnswers.length > 0 && !wasAbandoned) {
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
      )
      .join("\n\n");

    const improvementPrompt = `
      The user got the following ${topic || domain.industry} questions wrong:

      ${wrongQuestionsText}

      Based on these mistakes, provide a concise, specific improvement tip.
      Focus on the knowledge gaps revealed by these wrong answers.
      Keep the response under 2 sentences and make it encouraging.
      Don't explicitly mention the mistakes, instead focus on what to learn/practice.
    `;

    try {
      const tipResult = await model.generateContent(improvementPrompt);
      improvementTip = tipResult.response.text().trim();
    } catch (error) {
      console.error("Error generating improvement tip:", error);
    }
  }

  try {
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        quizType,
        topic,
        quizScore: score,
        questions: questionResults,
        category: topic || "Technical",
        improvementTip,
      },
    });

    // Record questions in history (for deduplication)
    await db.userQuestionHistory.createMany({
      data: questions.map((q) => {
        const questionId = crypto.createHash("md5").update(q.question).digest("hex").slice(0, 16);
        return {
          userId: user.id,
          domainId: domain.id,
          questionId,
          questionText: q.question,
          embedding: [], // Will be populated if needed later
        };
      }),
      skipDuplicates: true,
    });

    return assessment;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}

// export async function saveQuizResult(questions, answers, score) {
//   const { userId } = await auth();
//   if (!userId) throw new Error("Unauthorized");

//   const user = await db.user.findUnique({
//     where: { clerkUserId: userId },
//   });

//   if (!user) throw new Error("User not found");

//   const domain = await getActiveDomain();

//   const questionResults = questions.map((q, index) => ({
//     question: q.question,
//     answer: q.correctAnswer,
//     userAnswer: answers[index] || "Not attempted", // Handle null answers
//     isCorrect: q.correctAnswer === answers[index],
//     explanation: q.explanation,
//   }));

//   // Get wrong answers
//   const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

//   // Only generate improvement tips if there are wrong answers AND quiz wasn't abandoned
//   let improvementTip = null;
//   const wasAbandoned = answers.every(a => a === null);

//   if (wrongAnswers.length > 0 && !wasAbandoned) {
//     const wrongQuestionsText = wrongAnswers
//       .map(
//         (q) =>
//           `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
//       )
//       .join("\n\n");

//     const improvementPrompt = `
//       The user got the following ${domain.industry} technical interview questions wrong:

//       ${wrongQuestionsText}

//       Based on these mistakes, provide a concise, specific improvement tip.
//       Focus on the knowledge gaps revealed by these wrong answers.
//       Keep the response under 2 sentences and make it encouraging.
//       Don't explicitly mention the mistakes, instead focus on what to learn/practice.
//     `;

//     try {
//       const tipResult = await model.generateContent(improvementPrompt);
//       improvementTip = tipResult.response.text().trim();
//       console.log(improvementTip);
//     } catch (error) {
//       console.error("Error generating improvement tip:", error);
//     }
//   }

//   try {
//     const assessment = await db.assessment.create({
//       data: {
//         userId: user.id,
//         quizScore: score,
//         questions: questionResults,
//         category: "Technical",
//         improvementTip,
//       },
//     });

//     return assessment;
//   } catch (error) {
//     console.error("Error saving quiz result:", error);
//     throw new Error("Failed to save quiz result");
//   }
// }

// export async function getAssessments() {
//   const { userId } = await auth();
//   if (!userId) throw new Error("Unauthorized");

//   const user = await db.user.findUnique({
//     where: { clerkUserId: userId },
//   });

//   if (!user) throw new Error("User not found");

//   try {
//     const assessments = await db.assessment.findMany({
//       where: {
//         userId: user.id,
//       },
//       orderBy: {
//         createdAt: "asc",
//       },
//     });

//     return assessments;
//   } catch (error) {
//     console.error("Error fetching assessments:", error);
//     throw new Error("Failed to fetch assessments");
//   }
// }
