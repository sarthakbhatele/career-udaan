"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./dashboard";
import { getDomainLimit } from "@/lib/plan-limits";

export async function updateUser(data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    let user = await db.user.findUnique({
      where: { clerkUserId: userId },
      include: { domains: true } // NEW: Include domains to count
    });

    if (!user) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      user = await db.user.findUnique({
        where: { clerkUserId: userId },
        include: { domains: true }
      });
    }

    if (!user) {
      throw new Error("Unable to find your profile. Please refresh the page and try again.");
    }

    // ========== NEW: DOMAIN LIMIT CHECK ==========
    const domainLimit = getDomainLimit(user.plan);
    const existingDomainCount = user.domains.length;

    // Check if user is trying to add a NEW domain
    const isNewDomain = !user.domains.some(d => d.industry === data.industry);

    if (isNewDomain && existingDomainCount >= domainLimit) {
      return {
        success: false,
        error: user.plan === 'FREE'
          ? "Free plan allows 1 domain only. Upgrade to PRO to add more domains."
          : `You've reached the maximum of ${domainLimit} domains for your plan.`
      };
    }
    // ============================================

    const result = await db.$transaction(
      async (tx) => {
        let industryInsight = await tx.industryInsight.findUnique({
          where: { industry: data.industry },
        });

        if (!industryInsight) {
          // Create placeholder (no AI call here)
          industryInsight = await tx.industryInsight.create({
            data: {
              industry: data.industry,
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
        }

        // Check if domain already exists (update scenario)
        const existingDomain = user.domains.find(d => d.industry === data.industry);

        let domain;
        if (existingDomain) {
          // UPDATE existing domain
          domain = await tx.userDomain.update({
            where: { id: existingDomain.id },
            data: {
              experience: parseInt(data.experience) || 0,
              bio: data.bio,
              skills: typeof data.skills === 'string'
                ? data.skills.split(',').map(s => s.trim()).filter(Boolean)
                : Array.isArray(data.skills)
                  ? data.skills
                  : [],
            }
          });
        } else {
          // CREATE new domain
          domain = await tx.userDomain.create({
            data: {
              userId: user.id,
              industry: data.industry,
              experience: parseInt(data.experience) || 0,
              bio: data.bio,
              skills: typeof data.skills === 'string'
                ? data.skills.split(',').map(s => s.trim()).filter(Boolean)
                : Array.isArray(data.skills)
                  ? data.skills
                  : [],
            }
          });

          // Set as active if first domain
          if (!user.activeDomainId) {
            await tx.user.update({
              where: { id: user.id },
              data: { activeDomainId: domain.id }
            });
          }
        }

        return { domain, industryInsight };
      },
      { timeout: 20000 }
    );

    // Trigger insight generation ONLY if domain is new
    if (!existingDomain) {
      await inngest.send({
        name: "industry/generate",
        data: { industry: data.industry },
      });
    }
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/onboarding");

    return {
      success: true,
      domain: result.domain
    };
  } catch (error) {
    console.error("Error updating user and industry:", error);
    return {
      success: false,
      error: error.message || "Failed to update profile",
    };
  }
}

export async function getUserOnboardingStatus() {
  try {
    const { userId } = await auth();
    if (!userId) return { isOnboarded: false };

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      include: {
        domains: true,
        // NEW: Include plan for UI
        _count: { select: { domains: true } }
      }
    });

    if (!user) return { isOnboarded: false };

    return {
      isOnboarded: user.domains.length > 0,
      plan: user.plan, // NEW: Return plan
      domainCount: user._count.domains // NEW: Return count
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return { isOnboarded: false };
  }
}

// List all domains for current user
// GET: Fetch all domains for current user
export async function getUserDomains() {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      include: {
        domains: {
          include: {
            industryInsights: true
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!user) return null;

    const domainLimit = getDomainLimit(user.plan);

    return {
      domains: user.domains,
      activeDomainId: user.activeDomainId,
      plan: user.plan,
      domainLimit
    };
  } catch (error) {
    console.error("Error fetching user domains:", error);
    return null;
  }
}

// Switch active domain
export async function switchActiveDomain(domainId) {
  const { userId } = await auth();
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: { domains: true }
  });

  // Verify domain belongs to user
  const domain = user.domains.find(d => d.id === domainId);
  if (!domain) throw new Error("Domain not found");

  await db.user.update({
    where: { id: user.id },
    data: { activeDomainId: domainId }
  });

  revalidatePath("/");
  return domain;
}

// DELETE: Remove a domain (with safety checks)
export async function deleteDomain(domainId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      include: { domains: true }
    });

    if (!user) throw new Error("User not found");

    // Safety checks
    if (user.domains.length === 1) {
      throw new Error("Cannot delete your only domain");
    }

    if (user.activeDomainId === domainId) {
      throw new Error("Cannot delete active domain. Switch to another domain first.");
    }

    const domain = user.domains.find(d => d.id === domainId);
    if (!domain) throw new Error("Domain not found");

    // Delete domain (cascades to related data)
    await db.userDomain.delete({
      where: { id: domainId }
    });

    revalidatePath("/domains");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error deleting domain:", error);
    throw error;
  }
}