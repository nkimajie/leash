import "server-only";

import { z } from "zod";
import { BadRequestError, ConflictError, NotFoundError } from "@/server/errors";
import { denyHeldDecision } from "@/server/spending/spending-service";
import { defineTool } from "./define-tool";

// There is deliberately no "approve" tool. The assistant can say no for you, which only ever
// releases money, but saying yes is always your own tap. A scam that takes over the assistant,
// or a voice on the TV, can't approve anything.

export const denyHeldItemTool = defineTool({
  name: "deny_held_item",
  description:
    "Deny something that is waiting for the user's approval, when the user asks you to. PayPal releases the reserved money, so they're never charged. Pass their reason in their own words, so their twin learns from it. Get the id from read_my_leash. You can't approve anything: only the user can, with a tap.",
  inputSchema: z.object({
    decisionId: z.string().describe("The id of the waiting item, from read_my_leash"),
    reason: z.string().max(240).nullable().describe("Why the user said no, in their own words, if they said"),
  }),
  async run({ decisionId, reason }) {
    try {
      const decision = await denyHeldDecision(decisionId, { note: reason ?? undefined });
      return { summary: `Denied "${decision.title}". PayPal released the reserved money.`, decision };
    } catch (error) {
      const expected =
        error instanceof NotFoundError || error instanceof ConflictError || error instanceof BadRequestError;
      if (!expected) throw error;
      return { summary: `Couldn't deny it: ${(error as Error).message}` };
    }
  },
});
