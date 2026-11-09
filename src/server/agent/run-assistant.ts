import "server-only";

// Entry point for the agent section: starts a request and streams what the assistant does.
// Uses Claude when ANTHROPIC_API_KEY is set, and the scripted mock assistant otherwise.

import Anthropic from "@anthropic-ai/sdk";
import type { AssistantEvent, AssistantRequest } from "@/schemas";
import { serviceModes } from "@/server/config/environment";
import * as database from "@/server/database";
import { resetDemoIfQuiet } from "@/server/demo-mode";
import { mayUseClaude } from "./claude-allowance";
import { runClaudeAssistant } from "./claude-assistant";
import { runMockAssistant } from "./mock-assistant";
import { readBudget } from "./read-request";

/**
 * @param source  "you" when you typed the request, "restock" when a schedule started it.
 *                Anything a restock buys is held for your approval.
 * @param visitor who is asking; in demo mode each visitor gets a daily allowance of Claude requests.
 */
export async function* runAssistant(
  prompt: string,
  source: AssistantRequest["source"] = "you",
  visitor?: string,
): AsyncGenerator<AssistantEvent> {
  const isFreshDemo = source === "you" && (await resetDemoIfQuiet());
  const rules = await database.spendingRules.loadSpendingRules();
  const request = await database.assistantRequests.startAssistantRequest(
    prompt,
    readBudget(prompt) ?? rules.defaultRequestBudget,
    source,
  );
  yield { type: "request_started", request };
  if (isFreshDemo) yield { type: "thinking", text: FRESH_DEMO_NOTE };

  try {
    if (serviceModes().assistant === "claude" && mayUseClaude(visitor)) {
      yield* runClaudeWithFallback(request);
    } else if (serviceModes().assistant === "claude") {
      yield {
        type: "thinking",
        text: "You've used today's Claude allowance on this demo, so the built-in assistant takes over.",
      };
      yield* runMockAssistant(request);
    } else {
      yield* runMockAssistant(request);
    }
    await database.assistantRequests.markAssistantRequest(request.id, "finished");
  } catch (error) {
    console.error("Assistant failed", error);
    await database.assistantRequests.markAssistantRequest(request.id, "failed");
    yield { type: "error", message: "Something went wrong, so I stopped. Nothing else was paid." };
  }
  yield { type: "finished" };
}

/** Shown when the public demo cleared the previous visitor's changes before this request. */
export const FRESH_DEMO_NOTE = "Fresh demo: the last visitor's purchases and lessons were cleared.";

/**
 * If Claude can't be reached before it has used any tool (no credit, outage, rate limit),
 * the scripted assistant takes over so the app keeps working. Once a tool has run,
 * errors are not retried, so nothing is ever bought twice.
 */
async function* runClaudeWithFallback(request: AssistantRequest): AsyncGenerator<AssistantEvent> {
  let toolsUsed = 0;
  try {
    for await (const event of runClaudeAssistant(request)) {
      if (event.type === "tool_started") toolsUsed++;
      yield event;
    }
  } catch (error) {
    if (!(error instanceof Anthropic.APIError) || toolsUsed > 0) throw error;
    console.warn(`Claude unavailable (${error.status}), using the built-in assistant`, error.message);
    yield { type: "thinking", text: "Claude is unavailable right now, so I'm using the built-in assistant." };
    yield* runMockAssistant(request);
  }
}
