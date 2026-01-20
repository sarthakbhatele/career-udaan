// // interview/page.jsx
// import { getAssessments } from "@/actions/interview";
// import { checkDailyQuizLimit } from "@/lib/rag/quiz-limits";
// import { auth } from "@clerk/nextjs/server";
// import { db } from "@/lib/prisma";
// import StatsCards from "./_components/stats-cards";
// import PerformanceChart from "./_components/performace-chart";
// import QuizList from "./_components/quiz-list";

// export default async function InterviewPrepPage() {
//   // ✅ Fetch assessments
//   const assessments = await getAssessments();

//   // ✅ Fetch limit info
//   const { userId } = await auth();
//   const user = await db.user.findUnique({ where: { clerkUserId: userId } });
//   const limitInfo = await checkDailyQuizLimit(user.id);

//   return (
//     <div>
//       <div className="flex items-center justify-between mb-5">
//         <h1 className="text-6xl font-bold gradient-title">
//           Interview Preparation
//         </h1>
//       </div>
//       <div className="space-y-6">
//         {/* ✅ Pass limitInfo as prop */}
//         <StatsCards assessments={assessments} limitInfo={limitInfo} />
//         <PerformanceChart assessments={assessments} />
//         <QuizList assessments={assessments} />
//       </div>
//     </div>
//   );
// }

import { getAssessments } from "@/actions/interview";
import { checkBothQuizLimits } from "@/lib/rag/quiz-limits";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import StatsCards from "./_components/stats-cards";
import PerformanceChart from "./_components/performace-chart";
import QuizList from "./_components/quiz-list";

export default async function InterviewPrepPage() {
  const { userId } = await auth();
  const user = await db.user.findUnique({ where: { clerkUserId: userId } });

  const [standardAssessments, customAssessments, limits] = await Promise.all([
    getAssessments("standard"),
    getAssessments("custom"),
    checkBothQuizLimits(user.id),
  ]);

  return (
    <div>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-5 gap-4">
        <div>
          <h1 className="text-5xl md:text-6xl font-bold gradient-title">
            Interview Preparation
          </h1>
          <p className="text-muted-foreground mt-2">
            Track your progress and practice with quizzes
          </p>
        </div>
        <Link href="/interview/mock">
          <Button size="lg">Start Quiz</Button>
        </Link>
      </div>

      <Tabs defaultValue="standard" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="standard">
            Standard Quizzes ({standardAssessments.length})
          </TabsTrigger>
          <TabsTrigger value="custom">
            Custom Practice ({customAssessments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="space-y-6">
          <StatsCards
            assessments={standardAssessments}
            limitInfo={limits.standard}
            quizType="standard"
          />
          <PerformanceChart assessments={standardAssessments} />
          <QuizList assessments={standardAssessments} type="standard" />
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <StatsCards
            assessments={customAssessments}
            limitInfo={limits.custom}
            quizType="custom"
          />
          <PerformanceChart assessments={customAssessments} />
          <QuizList assessments={customAssessments} type="custom" />
        </TabsContent>
      </Tabs>
    </div>
  );
}