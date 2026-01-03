"use server";

import { getActiveDomain } from "@/lib/getActiveDomain";
import { db } from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export async function getIndustryInsights() {
  const domain = await getActiveDomain();

  // 1. Fetch insight from DB
  let insight = await db.industryInsight.findUnique({
    where: { industry: domain.industry },
  });

  // 2. If not found, create placeholder and trigger generation
  if (!insight) {
    insight = await db.industryInsight.create({
      data: {
        industry: domain.industry,
        salaryRanges: [],
        growthRate: 0,
        demandLevel: "Medium",
        topSkills: [],
        marketOutlook: "Neutral",
        keyTrends: [],
        recommendedSkills: [],
        generationStatus: "pending",
        lastAttemptAt: new Date(),
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Trigger background generation (Inngest will deduplicate)
    await inngest.send({
      name: "industry/generate",
      data: { industry: domain.industry },
    });

    return {
      ...insight,
      isGenerating: true,
      message: "Generating insights for the first time. This takes 30-60 seconds.",
    };
  }

  // 3. If currently generating, return loading state
  if (insight.generationStatus === "generating") {
    return {
      ...insight,
      isGenerating: true,
      message: "Insights are being generated. Refresh in a moment.",
    };
  }

  // 4. If failed, check cooldown before retriggering
  if (insight.generationStatus === "failed") {
    const timeSinceAttempt = Date.now() - insight.lastAttemptAt.getTime();

    if (timeSinceAttempt > COOLDOWN_MS) {
      // Cooldown expired - trigger retry
      await inngest.send({
        name: "industry/generate",
        data: { industry: domain.industry },
      });

      return {
        ...insight,
        isGenerating: true,
        message: "Retrying insight generation. Please refresh in a moment.",
        error: insight.generationError,
      };
    }

    // Still in cooldown - show error without retriggering
    const cooldownRemaining = Math.ceil((COOLDOWN_MS - timeSinceAttempt) / 1000);
    return {
      ...insight,
      isGenerating: false,
      message: `Generation failed. Retry in ${cooldownRemaining}s.`,
      error: insight.generationError,
    };
  }

  // 5. If stale (>7 days), trigger refresh in background (no blocking)
  const isStale = new Date() > insight.nextUpdate;
  if (isStale) {
    const timeSinceAttempt = Date.now() - insight.lastAttemptAt.getTime();

    // Only trigger if cooldown expired (prevent refresh spam)
    if (timeSinceAttempt > COOLDOWN_MS) {
      await db.industryInsight.update({
        where: { industry: domain.industry },
        data: { generationStatus: "pending" },
      });

      await inngest.send({
        name: "industry/generate",
        data: { industry: domain.industry },
      });
    }
  }

  // 6. Return completed insights
  return {
    ...insight,
    isGenerating: false,
    isStale,
  };
}