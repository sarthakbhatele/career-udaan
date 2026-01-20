// mock/page.jsx
import { checkDailyQuizLimit } from "@/lib/rag/quiz-limits";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Quiz from "../_components/quiz";

export default async function MockInterviewPage() {
  // ✅ Fetch user and limit info
  const { userId } = await auth();
  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  const limitInfo = await checkDailyQuizLimit(user.id);

  return (
    <div className="container mx-auto space-y-4 py-6">
      <div className="flex flex-col space-y-2 mx-2">
        <div>
          <h1 className="text-6xl font-bold gradient-title">Mock Interview</h1>
          <p className="text-muted-foreground">
            Test your knowledge with industry-specific questions
          </p>
        </div>
      </div>
      {/* ✅ Pass remaining as prop */}
      <Quiz initialRemaining={limitInfo.remaining} />
    </div>
  );
}