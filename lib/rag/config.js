export const RAG_CONFIG = {
    TARGET_POOL_SIZE: 1000,
    BATCH_SIZE: 200, // Deprecated

    // NEW: High-frequency batching
    MACRO_BATCH_SIZE: 100,         // Target questions per run (10 batches of 10)
    MINI_BATCH_SIZE: 10,           // Reduced from 40 to 10 for speed & 100% completion
    MAX_RETRIES_PER_BATCH: 3,      // Slightly increased for robustness
    BATCH_DELAY_MS: 1000,          // Reduced wait time (since calls are faster now)
    EMERGENCY_BATCH_SIZE: 10,      // Match mini-batch size

    MIN_POOL_THRESHOLD: 100,
    DAILY_QUIZ_LIMIT: 10,
    QUESTIONS_PER_QUIZ: 10,
    SEMANTIC_SIMILARITY_THRESHOLD: 0.90,
};