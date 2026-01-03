import { db } from "@/lib/prisma";
import { getDomainLimit } from "./plan-limits";

export async function checkDomainLimit(userId) {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: {
            plan: true,
            domains: { select: { id: true } }
        }
    });

    if (!user) throw new Error("User not found");

    const limit = getDomainLimit(user.plan);
    const current = user.domains.length;

    return {
        canAddMore: current < limit,
        current,
        limit,
        plan: user.plan
    };
}