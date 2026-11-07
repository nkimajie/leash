import "server-only";

import type { SpendingRules } from "@/schemas";
import { DEFAULT_SPENDING_RULES, SpendingRulesSchema } from "@/schemas";
import { connectToSupabase, dataOrThrow } from "./client";

export async function loadSpendingRules(): Promise<SpendingRules> {
  const db = await connectToSupabase();
  const row = dataOrThrow(
    await db.from("spending_rules").select("rules").eq("user_id", "demo").maybeSingle(),
    "load your rules",
  );
  return row ? SpendingRulesSchema.parse(row.rules) : DEFAULT_SPENDING_RULES;
}

export async function saveSpendingRules(rules: SpendingRules): Promise<SpendingRules> {
  const db = await connectToSupabase();
  dataOrThrow(
    await db.from("spending_rules").upsert({ user_id: "demo", rules, updated_at: new Date().toISOString() }),
    "save your rules",
  );
  return rules;
}
