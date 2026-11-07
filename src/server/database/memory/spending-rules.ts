import "server-only";

import type { SpendingRules } from "@/schemas";
import { memoryTables } from "./store";

export async function loadSpendingRules(): Promise<SpendingRules> {
  return memoryTables.spendingRules;
}

export async function saveSpendingRules(rules: SpendingRules): Promise<SpendingRules> {
  memoryTables.spendingRules = rules;
  return rules;
}
