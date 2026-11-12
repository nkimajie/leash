import "server-only";

// Leash remembers: your last few exchanges, and what it really did in each one. Every request is
// already saved with Leash's reply, and every purchase or payment points back to the request that
// made it, so remembering is reading them back. It works across reloads and devices.
// "Start fresh" forgets the exchanges; the receipts in Money stay.

import type { Decision, EarlierTurn, Outcome } from "@/schemas";
import { formatMoney } from "@/lib/format";
import * as database from "@/server/database";

/** How many exchanges Leash keeps in mind. */
const REMEMBER = 10;

/** Where each purchase or payment stands now, which may have changed since: held, then approved. */
const WHERE_IT_STANDS: Record<Outcome, string> = {
  auto_approved: "paid",
  approved: "paid, after you approved it",
  held: "waiting for your okay (money reserved, not taken)",
  denied: "you denied it, so you were never charged",
  blocked: "blocked by a hard limit, PayPal was never called",
  refunded: "refunded",
  failed: "PayPal couldn't pay it, nothing was taken",
};

/** Your last few exchanges with Leash, oldest first. */
export async function recallConversation(): Promise<EarlierTurn[]> {
  const requests = await database.assistantRequests.listRememberedRequests(REMEMBER);
  if (requests.length === 0) return [];
  const decisions = await database.decisions.listDecisions();
  return requests.map((request) => ({
    requestId: request.id,
    you: request.prompt,
    leash: request.reply ?? "",
    did: decisions
      .filter((decision) => decision.requestId === request.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(describeDecision),
    at: request.createdAt,
  }));
}

/** "Start fresh": Leash forgets the conversation. */
export async function forgetConversation(): Promise<void> {
  await database.assistantRequests.forgetRequests();
}

/** "Sony CUH-ZEY1 camera from gamestop.com, $14.99: paid" or "Payment to Sam, $25.00: paid". */
function describeDecision(decision: Decision): string {
  const what = decision.kind === "purchase" ? `${decision.title} from ${decision.counterparty}` : decision.title;
  return `${what}, ${formatMoney(decision.amount)}: ${WHERE_IT_STANDS[decision.outcome]}`;
}
