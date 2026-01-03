"use server";

import { getActiveDomain } from "@/lib/getActiveDomain";
import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function generateQuiz() {
  const domain = await getActiveDomain();

  // Unique cache key per domain + difficulty (extendable later)
  const taskKey = `${domain.id}:basic`;

  // 1️⃣ DB-first read (cache)
  const cached = await db.rAGOutput.findUnique({
    where: {
      taskType_taskKey: {
        taskType: "quiz",
        taskKey,
      },
    },
  });

  if (
    cached &&
    (!cached.expiresAt || cached.expiresAt > new Date())
  ) {
    return cached.content.questions;
  }

  // 2️⃣ Trigger background generation (NON-blocking)
  await inngest.send({
    name: "rag/generate",
    data: {
      taskType: "quiz",
      taskKey,
      domainId: domain.id,
      taskParams: {
        questionCount: 10,
        difficulty: "basic",
        skills: domain.skills ?? [],
        industry: domain.industry,
      },
    },
  });

  // 3️⃣ Immediate safe response (UI shows loader/skeleton)
  return {
    generating: true,
    message: "Quiz is being generated. Please refresh shortly.",
  };
}

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
    userAnswer: answers[index],
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));

  // Get wrong answers
  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  // Only generate improvement tips if there are wrong answers
  let improvementTip = null;
  if (wrongAnswers.length > 0) {
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
