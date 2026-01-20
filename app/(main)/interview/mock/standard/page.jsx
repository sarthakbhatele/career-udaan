import { checkDailyQuizLimit } from "@/lib/rag/quiz-limits";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Quiz from "../../_components/quiz";

export default async function StandardQuizPage() {
    const { userId } = await auth();
    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    const limitInfo = await checkDailyQuizLimit(user.id, "standard");

    return (
        <div className="container mx-auto space-y-4 py-6">
            <div className="flex flex-col space-y-2 mx-2">
                <div>
                    <h1 className="text-6xl font-bold gradient-title">Standard Interview Quiz</h1>
                    <p className="text-muted-foreground">
                        10 questions covering your domain skills
                    </p>
                </div>
            </div>
            <Quiz initialRemaining={limitInfo.remaining} quizType="standard" />
        </div>
    );
}