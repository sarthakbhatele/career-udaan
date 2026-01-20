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
        <CustomQuizClient
            suggestedTopics={suggestedTopics}
            limitInfo={limitInfo}
        />
    );
}