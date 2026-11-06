import "server-only";

// Entry point for the agent section: starts a request and streams what the assistant does.

import type { AssistantEvent } from "@/schemas";
import * as database from "@/server/database";
import { runMockAssistant } from "./mock-assistant";
import { readBudget } from "./read-request";

export async function* runAssistant(prompt: string): AsyncGenerator<AssistantEvent> {
  const rules = await database.spendingRules.loadSpendingRules();
  const request = await database.assistantRequests.startAssistantRequest(
    prompt,
    readBudget(prompt) ?? rules.defaultRequestBudget,
  );
  yield { type: "request_started", request };

  try {
    // TODO(step 5): run the Claude agent instead when ANTHROPIC_API_KEY is set.
    yield* runMockAssistant(request);
    await database.assistantRequests.markAssistantRequest(request.id, "finished");
  } catch (error) {
    console.error("Assistant failed", error);
    await database.assistantRequests.markAssistantRequest(request.id, "failed");
    yield { type: "error", message: "Something went wrong, so I stopped. Nothing else was paid." };
  }
  yield { type: "finished" };
}
