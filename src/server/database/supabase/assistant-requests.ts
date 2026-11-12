import "server-only";

import type { AssistantRequest } from "@/schemas";
import { connectToSupabase, dataOrThrow, rowsOrThrow } from "./client";
import { toAssistantRequest } from "./rows";

export async function startAssistantRequest(
  prompt: string,
  budget: number,
  source: AssistantRequest["source"] = "you",
): Promise<AssistantRequest> {
  const db = await connectToSupabase();
  const row = dataOrThrow(
    await db.from("assistant_requests").insert({ prompt, budget, source, status: "working" }).select().single(),
    "start a request",
  );
  return toAssistantRequest(row);
}

/** Marks a request finished or failed, with Leash's reply so it remembers the exchange. */
export async function markAssistantRequest(
  id: string,
  status: AssistantRequest["status"],
  reply: string | null = null,
): Promise<void> {
  const db = await connectToSupabase();
  dataOrThrow(await db.from("assistant_requests").update({ status, reply }).eq("id", id), "update a request");
}

/** Your latest requests that Leash answered and still remembers, oldest first. */
export async function listRememberedRequests(limit: number): Promise<AssistantRequest[]> {
  const db = await connectToSupabase();
  const rows = rowsOrThrow(
    await db
      .from("assistant_requests")
      .select("*")
      .eq("source", "you")
      .eq("remembered", true)
      .not("reply", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit),
    "recall the conversation",
  );
  return rows.map(toAssistantRequest).reverse();
}

/** "Start fresh": Leash forgets every exchange so far. The requests and their receipts stay. */
export async function forgetRequests(): Promise<void> {
  const db = await connectToSupabase();
  dataOrThrow(
    await db.from("assistant_requests").update({ remembered: false }).eq("remembered", true),
    "start a fresh conversation",
  );
}
