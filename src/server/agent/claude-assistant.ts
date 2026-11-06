import "server-only";

// The real assistant: Claude decides which tools to call, one step at a time.
// Claude never touches money directly. It can only call the tools in ./tools, and every
// purchase or payment goes through the spending rules, PayPal and the digital twin.

import Anthropic from "@anthropic-ai/sdk";
import type { AssistantEvent, AssistantRequest } from "@/schemas";
import { describeToolsForModel, runTool, type ToolContext, type ToolResult } from "./tools";

/** Claude Haiku is fast and cheap, and good enough at choosing tools for this job. */
const MODEL = "claude-haiku-5-5";

/** Safety net: stop after this many rounds of tool calls, even if Claude wants to continue. */
const MAX_ROUNDS = 12;

const INSTRUCTIONS = `You are Leash, a personal assistant that shops and pays people with the user's PayPal, like a digital twin of the user.

How to work:
- Shopping: call recall_preferences first. Search for each thing the request needs, pick the best fit, call check_purchase_rules, then buy_product with a short reason.
- Never buy a product marked as something the user's twin avoids. Pick another result or skip it, and say why.
- Keep the total of all purchases within the budget given with the request. Only buy what the request asks for, and never buy the same item twice.
- Paying people: call check_payment_rules, then pay_person.
- If the user tells you something about their taste ("I don't like plastic"), save it with remember_preference.
- The spending rules are applied for you. A purchase or payment can be paid now, held for the user's approval (money reserved, not taken), or blocked. Held and blocked are normal results: never retry or try to get around them.
- Before each tool call, write one short sentence saying what you are doing and why. The user watches these live.
- Finish with a short reply (one to three sentences, plain text, no markdown) saying what was paid, what is waiting for approval, and anything blocked or skipped.`;

const claude = new Anthropic();

export async function* runClaudeAssistant(request: AssistantRequest): AsyncGenerator<AssistantEvent> {
  const context: ToolContext = { request };
  const tools = describeToolsForModel();
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `${request.prompt}\n\n(Budget for this request: $${request.budget.toFixed(2)})` },
  ];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await claude.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium" },
      system: INSTRUCTIONS,
      tools,
      messages,
    });

    const said = textOf(response);
    const toolCalls = response.content.filter((block) => block.type === "tool_use");

    if (response.stop_reason === "refusal") {
      yield { type: "reply", text: "I can't help with that request, so I didn't buy or pay anything." };
      return;
    }
    if (toolCalls.length === 0) {
      yield { type: "reply", text: said || "Done." };
      return;
    }

    if (said) yield { type: "thinking", text: said };
    // Thinking blocks must go back to Claude unchanged, so keep the whole response.
    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const call of toolCalls) {
      const input = call.input as Record<string, unknown>;
      yield { type: "tool_started", tool: call.name, input };
      const result = await runTool(call.name, input, context);
      yield { type: "tool_finished", tool: call.name, summary: result.summary };
      if (result.decision) yield { type: "decision_made", decision: result.decision };
      toolResults.push({ type: "tool_result", tool_use_id: call.id, content: describeForClaude(result) });
    }
    messages.push({ role: "user", content: toolResults });
  }

  yield { type: "reply", text: "I stopped here because this request was taking too many steps." };
}

/** Claude needs the ids and prices in `data`, not just the readable summary. */
function describeForClaude(result: ToolResult): string {
  if (result.decision) {
    const { outcome, amount, ruleExplanation } = result.decision;
    return JSON.stringify({ outcome, amount, explanation: ruleExplanation });
  }
  return result.data === undefined ? result.summary : JSON.stringify(result.data);
}

function textOf(response: Anthropic.Message): string {
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text.trim())
    .join("\n")
    .trim();
}
