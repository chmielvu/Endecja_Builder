// src/config/mlConfig.ts
export const ML_CONFIG = {
  SCOUT_MODEL: 'gemini-2.5-flash-lite',   // Lowest latency/cost, thinking off default
  ARCHITECT_MODEL: 'gemini-2.5-flash',    // Strong reasoning + tools
  THINKING_SCOUT: { thinkingBudget: 1024 }, // Light thinking for search tasks
  THINKING_ARCHITECT: { thinkingBudget: -1 }, // Dynamic full reasoning, -1 means model decides
  GENERATION_CONFIG: { temperature: 0.1, topP: 0.9, topK: 32 } // Reduced creativity for factual tasks
} as const;