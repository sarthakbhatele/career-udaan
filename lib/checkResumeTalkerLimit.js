import { db } from "@/lib/prisma";
import { getResumeTalkerLimits } from "./plan-limits";
import { startOfMonth } from "date-fns";

// FUTURE: Check if user can create new conversation
export async function canCreateConversation(userId) {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: {
            plan: true,
            conversations: {
                where: {
                    createdAt: { gte: startOfMonth(new Date()) }
                },
                select: { id: true }
            }
        }
    });

    if (!user) throw new Error("User not found");

    const limits = getResumeTalkerLimits(user.plan);
    const thisMonth = user.conversations.length;

    return {
        canCreate: thisMonth < limits.maxConversationsPerMonth,
        used: thisMonth,
        limit: limits.maxConversationsPerMonth
    };
}

// FUTURE: Check if user can send more messages in conversation
export async function canSendMessage(conversationId) {
    const conversation = await db.resumeTalkerConversation.findUnique({
        where: { id: conversationId },
        select: {
            user: { select: { plan: true } },
            messages: { select: { id: true } }
        }
    });

    if (!conversation) throw new Error("Conversation not found");

    const limits = getResumeTalkerLimits(conversation.user.plan);
    const messageCount = conversation.messages.length;

    return {
        canSend: messageCount < limits.maxMessagesPerConversation,
        used: messageCount,
        limit: limits.maxMessagesPerConversation
    };
}