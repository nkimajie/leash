import "server-only";

import type { Decision, NewDecision } from "@/schemas";
import { connectToSupabase, dataOrThrow, rowsOrThrow } from "./client";
import { fromDecision, toDecision } from "./rows";

export async function listDecisions(): Promise<Decision[]> {
  const db = await connectToSupabase();
  const rows = rowsOrThrow(
    await db.from("decisions").select("*").order("created_at", { ascending: false }).limit(500),
    "list decisions",
  );
  return rows.map(toDecision);
}

export async function findDecisionById(id: string): Promise<Decision | null> {
  const db = await connectToSupabase();
  const row = dataOrThrow(await db.from("decisions").select("*").eq("id", id).maybeSingle(), "find a decision");
  return row ? toDecision(row) : null;
}

/** Finds the decision a PayPal webhook is about, by its order, authorization, capture or payout id. */
export async function findDecisionByPayPalId(paypalId: string): Promise<Decision | null> {
  const db = await connectToSupabase();
  const row = dataOrThrow(
    await db
      .from("decisions")
      .select("*")
      .or(
        [
          `paypal_authorization_id.eq.${paypalId}`,
          `paypal_capture_id.eq.${paypalId}`,
          `paypal_order_id.eq.${paypalId}`,
          `paypal_payout_id.eq.${paypalId}`,
        ].join(","),
      )
      .limit(1)
      .maybeSingle(),
    "find a decision by PayPal id",
  );
  return row ? toDecision(row) : null;
}

export async function saveNewDecision(details: NewDecision): Promise<Decision> {
  const db = await connectToSupabase();
  const row = dataOrThrow(
    await db.from("decisions").insert(fromDecision(details)).select().single(),
    "save a decision",
  );
  return toDecision(row);
}

export async function updateDecision(
  id: string,
  changes: Partial<Omit<Decision, "paypal">> & { paypal?: Partial<Decision["paypal"]> },
): Promise<Decision> {
  const db = await connectToSupabase();
  const row = dataOrThrow(
    await db
      .from("decisions")
      .update({ ...fromDecision(changes), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single(),
    "update a decision",
  );
  return toDecision(row);
}
