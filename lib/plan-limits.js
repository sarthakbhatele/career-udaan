export const PLAN_LIMITS = {
    FREE: {
        maxDomains: 1,
        // FUTURE: Resume Talker limits
        resumeTalker: {
            maxConversationsPerMonth: 3,
            maxMessagesPerConversation: 20
        }
    },
    PRO: {
        maxDomains: 3,
        // FUTURE: Resume Talker limits
        resumeTalker: {
            maxConversationsPerMonth: 999, // "unlimited"
            maxMessagesPerConversation: 999
        }
    }
};

// Helper to get limit for user
export function getDomainLimit(plan) {
    return PLAN_LIMITS[plan]?.maxDomains || PLAN_LIMITS.FREE.maxDomains;
}

// FUTURE: Resume Talker helpers
export function getResumeTalkerLimits(plan) {
    return PLAN_LIMITS[plan]?.resumeTalker || PLAN_LIMITS.FREE.resumeTalker;
}