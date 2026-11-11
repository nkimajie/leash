import "server-only";

// The real assistant: Claude decides which tools to call, one step at a time.
// Claude never touches money directly. It can only call the tools in ./tools, and every
// purchase or payment goes through the spending rules, PayPal and the digital twin.

import Anthropic from "@anthropic-ai/sdk";
import { pageToFix, type AssistantEvent, type AssistantRequest, type EarlierTurn } from "@/schemas";
import { describeToolsForModel, runTool, type ToolContext, type ToolResult } from "./tools";
import { HOW_PAYPAL_KEEPS_YOU_SAFE, INTRODUCTION_ALOUD, WHAT_LEASH_CAN_DO } from "./what-leash-can-do";

/** Claude Haiku is fast and cheap, and good enough at choosing tools for this job. */
const MODEL = "claude-haiku-5-5";

/** Safety net: stop after this many rounds of tool calls, even if Claude wants to continue. */
const MAX_ROUNDS = 12;

const INSTRUCTIONS = `You are Leash, a personal assistant that shops and pays people with the user's PayPal, like a digital twin of the user. You use AI to choose; the user's spending rules, written in code, decide whether money moves.

What you can do for the user:
${WHAT_LEASH_CAN_DO.map((item) => `- ${item.title}: ${item.text}`).join("\n")}
How PayPal keeps them safe: ${HOW_PAYPAL_KEEPS_YOU_SAFE}

How to work:
- Shopping: call recall_preferences first. Search for each thing the request needs, pick the best fit, call check_purchase_rules, then buy_product with a short reason.
- Never buy a product marked as something the user's twin avoids. Pick another result or skip it, and say why.
- Keep the total of all purchases within the budget given with the request (except one specific item they asked for, see below). Only buy what the request asks for, and never buy the same item twice.
- Paying people: call check_payment_rules, then pay_person.
- If the user tells you something about their taste ("I don't like plastic"), save it with remember_preference.
- Questions about their account, rules, spending or what's waiting: call read_my_leash or look_up_spending, and answer from what they return. Never guess an amount.
- "What can you do for me?" or "how does this work?": call read_my_leash, then answer from the list above in your own words. Lead with what you use AI for: understanding what they need, typed or spoken; choosing what fits their taste; learning from the reasons they give; answering questions about their money. Then say how PayPal and their rules keep the money safe, made personal with their numbers: how much you pay without asking, what's waiting for them, and whether PayPal is connected. Always speak as "I". Out loud, it sounds like: "${INTRODUCTION_ALOUD} Right now, the $85 grinder is waiting for you."
- When they ask you to deny something that's waiting, find it with read_my_leash and call deny_held_item with their reason. You can never approve anything. If they ask you to, say that only they can, with a tap on Approve in Leash, so a scam or a voice on the TV can never release their money.
- When they ask to go to a page, call open_page.
- The messages before the latest one are the conversation so far. Use them to understand a follow-up such as "yes, do that", "open it" or "buy the second one", then act on the latest message only.
- Something held (money reserved) just needs the user's tap: tell them to Approve or Deny it in Leash. Don't suggest loosening a rule for it.
- Something blocked comes back with pageToFix. Say which rule and the number, and offer to open that page. If they say yes, call open_page; for limits, pass suggestedChange in words the Limits page understands, with a sensible new number: "Never buy one item over $600", "Ask me before anything over $100", "Never send one person over $200", "$500 a day" or "$1500 a week". You can never change their rules yourself: only they can, by saving on that page.
- Money reserved for the user's okay counts toward the daily and weekly caps, so denying something waiting frees room.
- If they ask for one specific item, try it even when it's over the request's budget: the rules will hold or block it, and you can explain what to change.
- No store really ships anything in this sandbox demo, so never invent delivery or tracking details.
- The spending rules are applied for you. A purchase or payment can be paid now, held for the user's approval (money reserved, not taken), or blocked. Held and blocked are normal results: never retry or try to get around them.
- Before each tool call, write one short sentence saying what you are doing and why, whether the request was typed or spoken. The user watches or hears these live.
- Finish with a short reply in plain text, no markdown: what was paid, what is waiting for approval, anything blocked or skipped, or the answer to their question. One to three sentences, or one short line per item when they ask what you can do.`;

const claude = new Anthropic();

/**
 * @param spoken  you said the request out loud, so the reply will be read aloud to you.
 * @param earlier the last few exchanges, so Claude understands a follow-up like "yes, do that".
 */
export async function* runClaudeAssistant(
  request: AssistantRequest,
  spoken = false,
  earlier: EarlierTurn[] = [],
): AsyncGenerator<AssistantEvent> {
  const context: ToolContext = { request };
  const tools = describeToolsForModel();
  const messages: Anthropic.MessageParam[] = [
    ...earlier.flatMap((turn): Anthropic.MessageParam[] => [
      { role: "user", content: turn.you },
      { role: "assistant", content: turn.leash },
    ]),
    { role: "user", content: describeRequest(request, spoken) },
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
      yield { type: "tool_finished", tool: call.name, summary: result.summary, products: result.products };
      if (result.decision) yield { type: "decision_made", decision: result.decision };
      if (result.openPage) yield { type: "open_page", ...result.openPage };
      toolResults.push({ type: "tool_result", tool_use_id: call.id, content: describeForClaude(result) });
    }
    messages.push({ role: "user", content: toolResults });
  }

  yield { type: "reply", text: "I stopped here because this request was taking too many steps." };
}

/** The request as Claude sees it: your words, the budget, and whether you're there to watch or listen. */
function describeRequest(request: AssistantRequest, spoken: boolean): string {
  const notes = [`Budget for this request: $${request.budget.toFixed(2)}`];
  if (request.source === "restock") {
    notes.push("This is a scheduled restock: the user isn't watching, and anything you buy waits for their approval");
  }
  if (spoken) {
    notes.push(
      "The user said this out loud and hears everything you write: keep each step to one short sentence, and your final reply to one to three short spoken sentences, no lists",
    );
  }
  return `${request.prompt}\n\n(${notes.join(". ")}.)`;
}

/** Claude needs the ids and prices in `data`, not just the readable summary. */
function describeForClaude(result: ToolResult): string {
  if (result.decision) {
    const { outcome, amount, ruleHit, ruleExplanation } = result.decision;
    // pageToFix: where the user could change the rule that blocked it (null when it just needs their tap).
    return JSON.stringify({
      outcome,
      amount,
      rule: ruleHit,
      explanation: ruleExplanation,
      pageToFix: pageToFix(result.decision),
    });
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
