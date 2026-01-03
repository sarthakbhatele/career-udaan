import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function getActiveDomain() {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { clerkUserId: userId },
        include: {
            activeDomain: {
                include: { industryInsights: true }
            }
        }
    });

    if (!user) throw new Error("User not found");
    if (!user.activeDomain) throw new Error("No active domain");

    return user.activeDomain;
}