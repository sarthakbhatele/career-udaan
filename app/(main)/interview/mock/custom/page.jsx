import CustomQuizClient from "./_components/custom-quiz-client";
import { checkDailyQuizLimit } from "@/lib/rag/quiz-limits";
import { getActiveDomain } from "@/lib/getActiveDomain";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export default async function CustomQuizPage() {
    const { userId } = await auth();
    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    const domain = await getActiveDomain();
    const limitInfo = await checkDailyQuizLimit(user.id, "custom");

    const suggestedTopics = domain.skills?.slice(0, 8) || [];

    return (
        <div className="container mx-auto space-y-4 py-6">
            <div className="flex flex-col space-y-1">
                <div>
                    <h1 className="text-6xl font-bold gradient-title">Custom Practice Quiz</h1>
                    <p className="text-muted-foreground">
                        Choose a topic to focus your practice session
                    </p>
                </div>
            </div>
            <CustomQuizClient
                suggestedTopics={suggestedTopics}
                limitInfo={limitInfo}
            />
        </div>
    );
}