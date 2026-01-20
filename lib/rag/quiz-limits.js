// import { db } from "@/lib/prisma";
// import { RAG_CONFIG } from "./config";
// import { startOfDay, endOfDay } from "date-fns";

// export async function checkDailyQuizLimit(userId) {
//     const today = new Date();

//     const attemptsToday = await db.quizAttempt.count({
//         where: {
//             userId,
//             attemptDate: {
//                 gte: startOfDay(today),
//                 lte: endOfDay(today),
//             },
//         },
//     });

//     const canAttempt = attemptsToday < RAG_CONFIG.DAILY_QUIZ_LIMIT;

//     return {
//         canAttempt,
//         attemptsToday,
//         limit: RAG_CONFIG.DAILY_QUIZ_LIMIT,
//         remaining: Math.max(0, RAG_CONFIG.DAILY_QUIZ_LIMIT - attemptsToday),
//     };
// }

// export async function recordQuizAttempt(userId, domainId) {
//     await db.quizAttempt.create({
//         data: {
//             userId,
//             domainId,
//         },
//     });
// }

import { db } from "@/lib/prisma";
import { RAG_CONFIG } from "./config";
import { startOfDay, endOfDay } from "date-fns";

export async function checkDailyQuizLimit(userId, quizType = "standard") {
    const today = new Date();

    const attemptsToday = await db.quizAttempt.count({
        where: {
            userId,
            quizType,
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

export async function checkBothQuizLimits(userId) {
    const [standard, custom] = await Promise.all([
        checkDailyQuizLimit(userId, "standard"),
        checkDailyQuizLimit(userId, "custom"),
    ]);

    return {
        standard,
        custom,
        totalAttempts: standard.attemptsToday + custom.attemptsToday,
        totalRemaining: standard.remaining + custom.remaining,
    };
}

export async function recordQuizAttempt(userId, domainId, quizType = "standard", topic = null) {
    await db.quizAttempt.create({
        data: {
            userId,
            domainId,
            quizType,
            topic,
        },
    });
}