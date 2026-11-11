import "server-only";

// The Leash API for outside AI agents (routes in src/app/api/v1, described in schemas/leash-api.ts).
// Each call runs the very same tools as Leash's own assistant, so the rules, the PayPal flow and the
// digital twin behave exactly the same. And like the assistant, an outside agent can't approve
// anything: there is no tool or endpoint for it. Only the person can, in Leash.

import type { Decision, PaymentRequest, PurchaseRequest } from "@/schemas";
import { runTool, type ToolContext, type ToolResult } from "@/server/agent/tools";
import * as database from "@/server/database";
import { BadRequestError, NotFoundError } from "@/server/errors";

export async function buyForAgent({ productId, reasoning, agentName }: PurchaseRequest): Promise<Decision> {
  const result = await runAsAgent(agentName, `buy product ${productId}`, (context) =>
    runTool("buy_product", { productId, reasoning: signedBy(agentName, reasoning) }, context),
  );
  if (!result.decision) throw new NotFoundError(result.summary); // "No product with id ... Search first."
  return result.decision;
}

export async function payForAgent({ personName, amount, note, reasoning, agentName }: PaymentRequest): Promise<Decision> {
  const result = await runAsAgent(agentName, `pay ${personName} $${amount}`, (context) =>
    runTool("pay_person", { personName, amount, note, reasoning: signedBy(agentName, reasoning) }, context),
  );
  if (!result.decision) throw new BadRequestError(result.summary);
  return result.decision;
}

/** Saves each call as a request from an outside agent, with the person's usual budget per request. */
async function runAsAgent(
  agentName: string | undefined,
  what: string,
  work: (context: ToolContext) => Promise<ToolResult>,
): Promise<ToolResult> {
  const rules = await database.spendingRules.loadSpendingRules();
  const request = await database.assistantRequests.startAssistantRequest(
    `${agentName ?? "An outside agent"}: ${what}`,
    rules.defaultRequestBudget,
    "agent",
  );
  try {
    const result = await work({ request });
    await database.assistantRequests.markAssistantRequest(request.id, "finished");
    return result;
  } catch (error) {
    await database.assistantRequests.markAssistantRequest(request.id, "failed");
    throw error;
  }
}

/** The receipt in Money shows who asked: "Claude Desktop: these beans are fair-trade and under $20." */
const signedBy = (agentName: string | undefined, reasoning: string) =>
  agentName ? `${agentName}: ${reasoning}` : reasoning;
