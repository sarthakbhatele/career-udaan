import { db } from "@/lib/prisma";
import { RAG_CONFIG } from "./config";
import { startOfDay, endOfDay } from "date-fns";

export async function checkDailyQuizLimit(userId) {
    const today = new Date();

    const attemptsToday = await db.quizAttempt.count({
        where: {
            userId,
            attemptDate: {
                gte: startOfDay(today),
                lte: endOfDay(today),
            },
        },
    });

    const canAttempt = attemptsToday < RAG_CONFIG.DAILY_QUIZ_LIMIT;

    return {
        canAttempt,
        attemptsToday,
        limit: RAG_CONFIG.DAILY_QUIZ_LIMIT,
        remaining: Math.max(0, RAG_CONFIG.DAILY_QUIZ_LIMIT - attemptsToday),
    };
}

export async function recordQuizAttempt(userId, domainId) {
    await db.quizAttempt.create({
        data: {
            userId,
            domainId,
        },
    });
}