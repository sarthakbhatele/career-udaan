export const RAG_CONFIG = {
    TARGET_POOL_SIZE: 1000,
    BATCH_SIZE: 200,
    MIN_POOL_THRESHOLD: 100, // Trigger expansion below this

    DAILY_QUIZ_LIMIT: 10, // Max attempts per user per day
    QUESTIONS_PER_QUIZ: 10,

    SEMANTIC_SIMILARITY_THRESHOLD: 0.90, // Higher = stricter dedup
};