import "server-only";

// In-memory tables, used until Supabase keys are set (step 6). Seeded with sample data
// so every screen has something to show. Data resets when the server restarts.

import type { AssistantRequest, Decision, Payee, Preference, SpendingRules } from "@/schemas";
import { DEFAULT_SPENDING_RULES } from "@/schemas";
import { samplePayees, samplePreferences, sampleDecisions } from "./sample-data";

type MemoryTables = {
  spendingRules: SpendingRules;
  payees: Payee[];
  preferences: Preference[];
  assistantRequests: AssistantRequest[];
  decisions: Decision[];
};

// Stored on globalThis so the data survives hot reloads while developing.
const globalStore = globalThis as unknown as { leashMemoryTables?: MemoryTables };

export const memoryTables: MemoryTables = (globalStore.leashMemoryTables ??= {
  spendingRules: DEFAULT_SPENDING_RULES,
  payees: samplePayees(),
  preferences: samplePreferences(),
  assistantRequests: [],
  decisions: sampleDecisions(),
});

export const newId = () => crypto.randomUUID();
export const timestampNow = () => new Date().toISOString();
