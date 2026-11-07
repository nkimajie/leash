import "server-only";

import type { AssistantRequest } from "@/schemas";
import { connectToSupabase, dataOrThrow } from "./client";
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

export async function markAssistantRequest(id: string, status: AssistantRequest["status"]): Promise<void> {
  const db = await connectToSupabase();
  dataOrThrow(await db.from("assistant_requests").update({ status }).eq("id", id), "update a request");
}
