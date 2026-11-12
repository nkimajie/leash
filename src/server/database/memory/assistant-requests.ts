import "server-only";

import type { AssistantRequest } from "@/schemas";
import { memoryTables, newId, timestampNow } from "./store";

export async function startAssistantRequest(
  prompt: string,
  budget: number,
  source: AssistantRequest["source"] = "you",
): Promise<AssistantRequest> {
  const request: AssistantRequest = {
    id: newId(),
    prompt,
    budget,
    status: "working",
    source,
    reply: null,
    remembered: true,
    createdAt: timestampNow(),
  };
  memoryTables.assistantRequests.unshift(request);
  return request;
}

/** Marks a request finished or failed, with Leash's reply so it remembers the exchange. */
export async function markAssistantRequest(
  id: string,
  status: AssistantRequest["status"],
  reply: string | null = null,
): Promise<void> {
  const request = memoryTables.assistantRequests.find((r) => r.id === id);
  if (request) Object.assign(request, { status, reply });
}

/** Your latest requests that Leash answered and still remembers, oldest first. */
export async function listRememberedRequests(limit: number): Promise<AssistantRequest[]> {
  return memoryTables.assistantRequests
    .filter((r) => r.source === "you" && r.remembered && r.reply !== null)
    .slice(0, limit)
    .reverse();
}

/** "Start fresh": Leash forgets every exchange so far. The requests and their receipts stay. */
export async function forgetRequests(): Promise<void> {
  for (const request of memoryTables.assistantRequests) request.remembered = false;
}
