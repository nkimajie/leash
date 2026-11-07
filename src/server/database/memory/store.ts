import "server-only";

// In-memory tables, used when Supabase keys are missing. Seeded with sample data so every
// screen has something to show. Data resets when the server restarts.

import type { AssistantRequest, Decision, Payee, Preference, Restock, SpendingRules, Wallet } from "@/schemas";
import { DEFAULT_SPENDING_RULES } from "@/schemas";
import { sampleDecisions, samplePayees, samplePreferences, sampleRestocks } from "../sample-data";

type MemoryTables = {
  spendingRules: SpendingRules;
  wallet: Wallet | null;
  payees: Payee[];
  preferences: Preference[];
  assistantRequests: AssistantRequest[];
  decisions: Decision[];
  restocks: Restock[];
};

// Stored on globalThis so the data survives hot reloads while developing.
const globalStore = globalThis as unknown as { leashMemoryTables?: MemoryTables };

export const memoryTables: MemoryTables = (globalStore.leashMemoryTables ??= {
  spendingRules: DEFAULT_SPENDING_RULES,
  wallet: null,
  payees: samplePayees(),
  preferences: samplePreferences(),
  assistantRequests: [],
  decisions: sampleDecisions(),
  restocks: sampleRestocks(),
});

export const newId = () => crypto.randomUUID();
export const timestampNow = () => new Date().toISOString();
