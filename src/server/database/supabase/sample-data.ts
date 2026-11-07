import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SPENDING_RULES } from "@/schemas";
import { sampleDecisions, samplePayees, samplePreferences, sampleRestocks } from "../sample-data";
import { fromDecision, fromPreference, fromRestock } from "./rows";

/**
 * Fills a brand-new database with the same sample data as memory mode.
 * Runs once: if your rules are already saved, the database isn't new and nothing happens.
 */
export async function addSampleDataIfEmpty(db: SupabaseClient): Promise<void> {
  const existing = await db.from("spending_rules").select("user_id").limit(1);
  if (existing.error) throw new Error(`Can't reach the Supabase tables: ${existing.error.message}`);
  if (existing.data.length > 0) return;

  const inserts = [
    db.from("spending_rules").insert({ user_id: "demo", rules: DEFAULT_SPENDING_RULES }),
    db.from("payees").insert(
      samplePayees().map(({ createdAt, ...payee }) => ({ ...payee, created_at: createdAt })),
    ),
    db.from("preferences").insert(samplePreferences().map(fromPreference)),
    db.from("decisions").insert(sampleDecisions().map(fromDecision)),
    db.from("restocks").insert(sampleRestocks().map(fromRestock)),
  ];
  for (const result of await Promise.all(inserts)) {
    if (result.error) throw new Error(`Couldn't add the sample data: ${result.error.message}`);
  }
}
