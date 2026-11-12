import "server-only";

import { z } from "zod";
import { isSampleHistory } from "@/schemas";
import * as database from "@/server/database";
import { BadRequestError, ConflictError, NotFoundError } from "@/server/errors";
import { refundDecision } from "@/server/spending/spending-service";
import { pickByTitle } from "../read-command";
import { defineTool } from "./define-tool";

// "The beans arrived broken, refund them." A refund only ever gives money back, so, like a deny,
// the assistant may do it when you ask. You name the purchase in your own words, and the newest
// paid one that matches is refunded.

export const refundPurchaseTool = defineTool({
  name: "refund_purchase",
  description:
    "Refund something the user bought, when they ask (\"the beans arrived broken, refund them\"). PayPal returns the money to them, and their twin learns from their reason. Name the purchase in the user's words or by its title; the newest paid purchase that matches is refunded. Money already sent to a person can't be refunded.",
  inputSchema: z.object({
    purchase: z
      .string()
      .min(2)
      .max(120)
      .describe("Which purchase, in the user's words or its title, e.g. 'the coffee beans'"),
    reason: z
      .string()
      .max(240)
      .nullable()
      .describe("Why the user wants the money back, in their own words, if they said"),
  }),
  async run({ purchase, reason }) {
    // Newest first, so "the beans" means the beans you bought last.
    const paid = (await database.decisions.listDecisions())
      .filter((d) => (d.outcome === "auto_approved" || d.outcome === "approved") && !isSampleHistory(d))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const match = pickByTitle(paid, purchase);
    if (!match) return { summary: `Nothing you've paid for matches "${purchase}", so I didn't refund anything.` };

    try {
      const decision = await refundDecision(match.id, { note: reason ?? undefined });
      return {
        summary: `Refunded "${decision.title}". PayPal is returning $${decision.amount.toFixed(2)} to you.`,
        decision,
      };
    } catch (error) {
      const expected =
        error instanceof NotFoundError || error instanceof ConflictError || error instanceof BadRequestError;
      if (!expected) throw error;
      return { summary: `Couldn't refund "${match.title}": ${(error as Error).message}` };
    }
  },
});
