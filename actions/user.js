// "use server";

// import { db } from "@/lib/prisma";
// import { auth } from "@clerk/nextjs/server";
// import { revalidatePath } from "next/cache";
// import { generateAIInsights } from "./dashboard";

// export async function updateUser(data) {
//   const { userId } = await auth();
//   if (!userId) throw new Error("Unauthorized");

//   const user = await db.user.findUnique({
//     where: { clerkUserId: userId },
//   });

//   if (!user) throw new Error("User not found");

//   try {
//     // Start a transaction to handle both operations
//     const result = await db.$transaction(
//       async (tx) => {
//         // First check if industry exists
//         let industryInsight = await tx.industryInsight.findUnique({
//           where: {
//             industry: data.industry,
//           },
//         });

//         // If industry doesn't exist, create it with default values
//         if (!industryInsight) {
//           const insights = await generateAIInsights(data.industry);

//           industryInsight = await db.industryInsight.create({
//             data: {
//               industry: data.industry,
//               ...insights,
//               nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//             },
//           });
//         }

//         // Now update the user
//         const updatedUser = await tx.user.update({
//           where: {
//             id: user.id,
//           },
//           data: {
//             industry: data.industry,
//             experience: data.experience,
//             bio: data.bio,
//             skills: data.skills,
//           },
//         });

//         return { updatedUser, industryInsight };
//       },
//       {
//         timeout: 10000, // default: 5000
//       }
//     );

//     revalidatePath("/");
//     return result.user;
//   } catch (error) {
//     console.error("Error updating user and industry:", error.message);
//     throw new Error("Failed to update profile");
//   }
// }

// export async function getUserOnboardingStatus() {
//   const { userId } = await auth();
//   if (!userId) throw new Error("Unauthorized");

//   const user = await db.user.findUnique({
//     where: { clerkUserId: userId },
//   });

//   if (!user) throw new Error("User not found");

//   try {
//     const user = await db.user.findUnique({
//       where: {
//         clerkUserId: userId,
//       },
//       select: {
//         industry: true,
//       },
//     });

//     return {
//       isOnboarded: !!user?.industry,
//     };
//   } catch (error) {
//     console.error("Error checking onboarding status:", error);
//     throw new Error("Failed to check onboarding status");
//   }
// }

"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./dashboard";

export async function updateUser(data) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Try to find the user directly - no complex retry logic needed
    // The user should already exist from checkUser()
    let user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    // If user still doesn't exist, try one more time after a brief wait
    if (!user) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      user = await db.user.findUnique({
        where: { clerkUserId: userId },
      });
    }

    if (!user) {
      throw new Error(
        "Unable to find your profile. Please refresh the page and try again."
      );
    }

    // Start a transaction to handle both operations
    const result = await db.$transaction(
      async (tx) => {
        // First check if industry exists
        let industryInsight = await tx.industryInsight.findUnique({
          where: {
            industry: data.industry,
          },
        });

        // If industry doesn't exist, create it with default values
        if (!industryInsight) {
          const insights = await generateAIInsights(data.industry);

          industryInsight = await tx.industryInsight.create({
            data: {
              industry: data.industry,
              ...insights,
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        }

        // Now update the user
        const updatedUser = await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            industry: data.industry,
            experience: parseInt(data.experience) || 0,
            bio: data.bio,
            skills: typeof data.skills === 'string'
              ? data.skills.split(',').map(s => s.trim()).filter(Boolean)
              : Array.isArray(data.skills)
                ? data.skills
                : [],
          },
        });

        return { updatedUser, industryInsight };
      },
      {
        timeout: 20000,
      }
    );

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/onboarding");

    return {
      success: true,
      user: result.updatedUser
    };
  } catch (error) {
    console.error("Error updating user and industry:", error);

    // Return structured error for better handling
    return {
      success: false,
      error: error.message || "Failed to update profile",
    };
  }
}

export async function getUserOnboardingStatus() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { isOnboarded: false };
    }

    // Try to find user
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        industry: true,
      },
    });

    // If user doesn't exist yet, return false
    if (!user) {
      return { isOnboarded: false };
    }

    return {
      isOnboarded: !!user.industry,
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    // Don't throw - return false to allow onboarding page to load
    return { isOnboarded: false };
  }
}