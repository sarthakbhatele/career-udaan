// // mock/page.jsx
// import { checkDailyQuizLimit } from "@/lib/rag/quiz-limits";
// import { auth } from "@clerk/nextjs/server";
// import { db } from "@/lib/prisma";
// import Quiz from "../_components/quiz";

// export default async function MockInterviewPage() {
//   // ✅ Fetch user and limit info
//   const { userId } = await auth();
//   const user = await db.user.findUnique({ where: { clerkUserId: userId } });
//   const limitInfo = await checkDailyQuizLimit(user.id);

//   return (
//     <div className="container mx-auto space-y-4 py-6">
//       <div className="flex flex-col space-y-2 mx-2">
//         <div>
//           <h1 className="text-6xl font-bold gradient-title">Mock Interview</h1>
//           <p className="text-muted-foreground">
//             Test your knowledge with industry-specific questions
//           </p>
//         </div>
//       </div>
//       {/* ✅ Pass remaining as prop */}
//       <Quiz initialRemaining={limitInfo.remaining} />
//     </div>
//   );
// }

import { checkBothQuizLimits } from "@/lib/rag/quiz-limits";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Target } from "lucide-react";

export default async function QuizModePage() {
  const { userId } = await auth();
  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  const limits = await checkBothQuizLimits(user.id);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-5xl md:text-6xl font-bold gradient-title mb-2">
          Choose Quiz Mode
        </h1>
        <p className="text-muted-foreground">
          Select your preferred quiz type to start practicing
        </p>
        <div className="mt-4">
          <Badge variant="outline" className="text-sm">
            Total attempts today: {limits.totalAttempts}/20
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {/* Standard Quiz Card */}
        <Card className="hover:border-primary transition-all">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Standard Interview Quiz</CardTitle>
            </div>
            <CardDescription>
              Test your knowledge with domain-wide questions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Questions:</span>
                <span className="font-medium">10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scope:</span>
                <span className="font-medium">All your skills</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily limit:</span>
                <span className="font-medium">
                  {limits.standard.remaining}/{limits.standard.limit} remaining
                </span>
              </div>
            </div>

            <Link href="/interview/mock/standard">
              <Button
                className="w-full"
                disabled={!limits.standard.canAttempt}
              >
                {limits.standard.canAttempt
                  ? "Start Standard Quiz"
                  : "Daily Limit Reached"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Custom Quiz Card */}
        <Card className="hover:border-primary transition-all">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Custom Practice Quiz</CardTitle>
            </div>
            <CardDescription>
              Focus on specific topics you want to master
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Questions:</span>
                <span className="font-medium">20</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scope:</span>
                <span className="font-medium">Your chosen topic</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily limit:</span>
                <span className="font-medium">
                  {limits.custom.remaining}/{limits.custom.limit} remaining
                </span>
              </div>
            </div>

            <Link href="/interview/mock/custom">
              <Button
                className="w-full"
                variant="outline"
                disabled={!limits.custom.canAttempt}
              >
                {limits.custom.canAttempt
                  ? "Start Custom Quiz"
                  : "Daily Limit Reached"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}