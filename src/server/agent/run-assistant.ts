import "server-only";

// Entry point for the agent section: starts a request and streams what the assistant does.
// Uses Claude when ANTHROPIC_API_KEY is set, and the scripted mock assistant otherwise.

import Anthropic from "@anthropic-ai/sdk";
import type { AssistantEvent, AssistantRequest, EarlierTurn } from "@/schemas";
import { serviceModes } from "@/server/config/environment";
import * as database from "@/server/database";
import { startFreshIfQuiet } from "@/server/demo-mode";
import { mayUseClaude } from "./claude-allowance";
import { runClaudeAssistant } from "./claude-assistant";
import { recallConversation } from "./conversation-memory";
import { runMockAssistant } from "./mock-assistant";
import { readBudget } from "./read-request";

/**
 * @param source  "you" when you asked, "restock" when a schedule started it.
 *                Anything a restock buys is held for your approval.
 * @param visitor who is asking; in demo mode each visitor gets a daily allowance of Claude requests.
 * @param spoken  you said it out loud, so the replies are kept short enough to listen to.
 */
export async function* runAssistant(
  prompt: string,
  source: AssistantRequest["source"] = "you",
  visitor?: string,
  spoken = false,
): AsyncGenerator<AssistantEvent> {
  if (source === "you") yield* startFreshIfQuiet();
  // Leash remembers your last few exchanges, so "yes, do that" makes sense. Only yours: a restock
  // or an outside agent starts with a clean slate. If memory can't be read, Leash still answers.
  const earlier =
    source === "you"
      ? await recallConversation().catch((error) => {
          console.warn("Couldn't recall the conversation, answering without it", error);
          return [];
        })
      : [];
  const rules = await database.spendingRules.loadSpendingRules();
  const request = await database.assistantRequests.startAssistantRequest(
    prompt,
    readBudget(prompt) ?? rules.defaultRequestBudget,
    source,
  );
  yield { type: "request_started", request };

  let reply: string | null = null;
  try {
    for await (const event of answer(request, spoken, earlier, visitor)) {
      if (event.type === "reply") reply = event.text;
      yield event;
    }
    // Saved with the reply, so Leash remembers this exchange next time.
    await database.assistantRequests.markAssistantRequest(request.id, "finished", reply);
  } catch (error) {
    console.error("Assistant failed", error);
    await database.assistantRequests.markAssistantRequest(request.id, "failed");
    yield { type: "error", message: "Something went wrong, so I stopped. Nothing else was paid." };
  }
  yield { type: "finished" };
}

/** Claude when it's set up and this visitor still has some allowance; the built-in assistant otherwise. */
async function* answer(
  request: AssistantRequest,
  spoken: boolean,
  earlier: EarlierTurn[],
  visitor?: string,
): AsyncGenerator<AssistantEvent> {
  if (serviceModes().assistant !== "claude") {
    yield* runMockAssistant(request, spoken, earlier);
  } else if (mayUseClaude(visitor)) {
    yield* runClaudeWithFallback(request, spoken, earlier);
  } else {
    yield {
      type: "thinking",
      text: "You've used today's Claude allowance on this demo, so the built-in assistant takes over.",
    };
    yield* runMockAssistant(request, spoken, earlier);
  }
}

/**
 * If Claude can't be reached before it has used any tool (no credit, outage, rate limit),
 * the scripted assistant takes over so the app keeps working. Once a tool has run,
 * errors are not retried, so nothing is ever bought twice.
 */
async function* runClaudeWithFallback(
  request: AssistantRequest,
  spoken: boolean,
  earlier: EarlierTurn[],
): AsyncGenerator<AssistantEvent> {
  let toolsUsed = 0;
  try {
    for await (const event of runClaudeAssistant(request, spoken, earlier)) {
      if (event.type === "tool_started") toolsUsed++;
      yield event;
    }
  } catch (error) {
    if (!(error instanceof Anthropic.APIError) || toolsUsed > 0) throw error;
    console.warn(`Claude unavailable (${error.status}), using the built-in assistant`, error.message);
    yield { type: "thinking", text: "Claude is unavailable right now, so I'm using the built-in assistant." };
    yield* runMockAssistant(request, spoken, earlier);
  }
}
