import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import { generateIndustryInsights, generateSingleIndustryInsight } from "@/lib/inngest/function";
import { generateRAGTask } from "@/lib/inngest/rag-functions";
import { seedContextChunks } from "@/lib/inngest/context-seeding";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateIndustryInsights,
    generateSingleIndustryInsight,
    generateRAGTask,
    seedContextChunks
  ],
});
