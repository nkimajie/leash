import "server-only";

import type { AssistantRequest } from "@/schemas";
import { memoryTables, newId, timestampNow } from "./memory-store";

// TODO(step 6): Supabase `assistant_requests` table.

export async function startAssistantRequest(prompt: string, budget: number): Promise<AssistantRequest> {
  const request: AssistantRequest = { id: newId(), prompt, budget, status: "working", createdAt: timestampNow() };
  memoryTables.assistantRequests.unshift(request);
  return request;
}

export async function markAssistantRequest(id: string, status: AssistantRequest["status"]): Promise<void> {
  const request = memoryTables.assistantRequests.find((r) => r.id === id);
  if (request) request.status = status;
}
