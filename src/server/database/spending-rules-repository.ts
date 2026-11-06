import "server-only";

import type { SpendingRules } from "@/schemas";
import { memoryTables } from "./memory-store";

// TODO(step 6): Supabase `spending_rules` table.

export async function loadSpendingRules(): Promise<SpendingRules> {
  return memoryTables.spendingRules;
}

export async function saveSpendingRules(rules: SpendingRules): Promise<SpendingRules> {
  memoryTables.spendingRules = rules;
  return rules;
}
