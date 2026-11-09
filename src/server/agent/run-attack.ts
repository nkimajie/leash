import "server-only";

// Plays one attack from lib/attacks.ts: an assistant that a scam has fully taken over.
// It calls the same tools as the real assistant, with no AI in between, so whatever happens
// to the money is decided by the spending rules alone.

import type { AssistantEvent, Decision, Product } from "@/schemas";
import { ATTACKS, type AttackStep } from "@/lib/attacks";
import { formatMoney } from "@/lib/format";
import * as database from "@/server/database";
import { startFreshIfQuiet } from "@/server/demo-mode";
import { NotFoundError } from "@/server/errors";
import { readBudget } from "./read-request";
import { runTool, type ToolContext } from "./tools";

export function findAttack(id: string) {
  const attack = ATTACKS.find((a) => a.id === id);
  if (!attack) throw new NotFoundError("There's no attack with that name.");
  return attack;
}

export async function* runAttack(attackId: string): AsyncGenerator<AssistantEvent> {
  const attack = findAttack(attackId);
  yield* startFreshIfQuiet();
  const rules = await database.spendingRules.loadSpendingRules();
  const request = await database.assistantRequests.startAssistantRequest(
    attack.request,
    readBudget(attack.request) ?? rules.defaultRequestBudget,
    "you",
  );
  const context: ToolContext = { request };
  yield { type: "request_started", request };
  yield { type: "attack", text: attack.scam };
  yield {
    type: "thinking",
    text: "Pretend the scam worked and the assistant now does exactly what it says. Only the leash is left in the way.",
  };

  const decisions: Decision[] = [];
  for (const step of attack.steps) {
    const decision = yield* carryOut(step, context);
    if (decision) decisions.push(decision);
  }

  await database.assistantRequests.markAssistantRequest(request.id, "finished");
  yield { type: "reply", text: whatTheLeashDid(decisions) };
  yield { type: "finished" };
}

async function* carryOut(step: AttackStep, context: ToolContext): AsyncGenerator<AssistantEvent, Decision | null> {
  if ("pay" in step) {
    const input = { ...step.pay, reasoning: "The message said the owner already approved it." };
    return yield* callTool("pay_person", input, context);
  }
  const search = await runTool("search_products", { query: step.buyFirstResultFor }, context);
  const product = ((search.data ?? []) as Product[])[0];
  if (!product) return null;
  const input = { productId: product.id, reasoning: `The hidden instructions said to buy "${product.title}".` };
  return yield* callTool("buy_product", input, context);
}

async function* callTool(
  name: string,
  input: Record<string, unknown>,
  context: ToolContext,
): AsyncGenerator<AssistantEvent, Decision | null> {
  yield { type: "tool_started", tool: name, input };
  const result = await runTool(name, input, context);
  yield { type: "tool_finished", tool: name, summary: result.summary, products: result.products };
  if (result.decision) yield { type: "decision_made", decision: result.decision };
  return result.decision ?? null;
}

function whatTheLeashDid(decisions: Decision[]): string {
  const total = (outcomes: Decision["outcome"][]) =>
    decisions.filter((d) => outcomes.includes(d.outcome)).reduce((sum, d) => sum + d.amount, 0);
  const blocked = total(["blocked"]);
  const held = total(["held"]);
  const paid = total(["auto_approved"]);
  const parts = [
    blocked > 0 && `${formatMoney(blocked)} blocked before PayPal was ever called`,
    held > 0 && `${formatMoney(held)} reserved but waiting for you`,
    paid > 0 && `${formatMoney(paid)} paid, only for what you asked for and inside your limits`,
  ].filter(Boolean);
  const outcome = parts.length > 0 ? parts.join(", ") : "nothing was paid";
  return `The leash held: ${outcome}. The AI can ask for anything, but only your rules decide what money moves.`;
}
