// import { getAssessments } from "@/actions/interview";
// import StatsCards from "./_components/stats-cards";
// import PerformanceChart from "./_components/performace-chart";
// import QuizList from "./_components/quiz-list";

// export default async function InterviewPrepPage() {
//   const assessments = await getAssessments();

//   return (
//     <div>
//       <div className="flex items-center justify-between mb-5">
//         <h1 className="text-6xl font-bold gradient-title">
//           Interview Preparation
//         </h1>
//       </div>
//       <div className="space-y-6">
//         <StatsCards assessments={assessments} />
//         <PerformanceChart assessments={assessments} />
//         <QuizList assessments={assessments} />
//       </div>
//     </div>
//   );
// }

// interview/page.jsx
import { getAssessments } from "@/actions/interview";
import { checkDailyQuizLimit } from "@/lib/rag/quiz-limits";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import StatsCards from "./_components/stats-cards";
import PerformanceChart from "./_components/performace-chart";
import QuizList from "./_components/quiz-list";

export default async function InterviewPrepPage() {
  // ✅ Fetch assessments
  const assessments = await getAssessments();

  // ✅ Fetch limit info
  const { userId } = await auth();
  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  const limitInfo = await checkDailyQuizLimit(user.id);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-6xl font-bold gradient-title">
          Interview Preparation
        </h1>
      </div>
      <div className="space-y-6">
        {/* ✅ Pass limitInfo as prop */}
        <StatsCards assessments={assessments} limitInfo={limitInfo} />
        <PerformanceChart assessments={assessments} />
        <QuizList assessments={assessments} />
      </div>
    </div>
  );
}