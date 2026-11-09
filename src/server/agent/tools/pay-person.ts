import "server-only";

import { z } from "zod";
import * as database from "@/server/database";
import { payPerson } from "@/server/spending/spending-service";
import { defineTool } from "./define-tool";

export const payPersonTool = defineTool({
  name: "pay_person",
  description:
    "Send money to a person with the user's PayPal. Someone new is added to the user's people list as not trusted, so the payment waits for approval. The spending rules are applied automatically.",
  inputSchema: z.object({
    personName: z.string().min(1).describe("Who to pay, e.g. 'Sam'"),
    amount: z.number().positive(),
    note: z.string().max(80).describe("What it's for, e.g. 'dinner'"),
    reasoning: z.string().min(5).describe("Why you are sending this payment"),
  }),
  async run({ personName, amount, note, reasoning }, { request }) {
    const known = await database.payees.findPayeeByName(personName);
    const payee =
      known ?? (await database.payees.addPayee({ name: personName, note: "Added by the assistant", trusted: false }));
    const decision = await payPerson(request, payee, amount, note, reasoning);
    // Someone new stays on your people list only if paying them wasn't blocked (no scammers on your list).
    if (!known && decision.outcome === "blocked") await database.payees.removePayee(payee.id);
    return { summary: `${decision.outcome}: ${decision.ruleExplanation}`, decision };
  },
});
