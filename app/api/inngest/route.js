import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { generateIndustryInsights, generateSingleIndustryInsight } from "@/lib/inngest/function";
import { seedContextOnInsightComplete, seedContextChunksCron } from "@/lib/inngest/context-seeding";
import { emergencyExpand, expandAllPools } from "@/lib/inngest/pool-management";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateIndustryInsights,
    generateSingleIndustryInsight,
    seedContextOnInsightComplete, // Event-driven
    seedContextChunksCron,        // Cron-based
    expandAllPools,
    emergencyExpand,
  ],
});