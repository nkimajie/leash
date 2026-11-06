import "server-only";

import { z } from "zod";
import * as database from "@/server/database";
import { findProductById } from "@/server/products/product-search";
import { checkPaymentRules, checkPurchaseRules } from "@/server/spending/spending-service";
import { defineTool } from "./define-tool";

export const checkPurchaseRulesTool = defineTool({
  name: "check_purchase_rules",
  description:
    "Check a product against the user's spending rules before buying. Says whether it can be bought now, needs the user's approval, or is blocked.",
  inputSchema: z.object({ productId: z.string().describe("The id from search_products") }),
  async run({ productId }, { request }) {
    const product = findProductById(productId);
    if (!product) return { summary: `No product with id ${productId}. Search first.` };
    const check = await checkPurchaseRules(request, product);
    return { summary: `${verdictLabel[check.verdict]}: ${check.explanation}`, data: check };
  },
});

export const checkPaymentRulesTool = defineTool({
  name: "check_payment_rules",
  description: "Check a payment to a person against the user's spending rules before sending it.",
  inputSchema: z.object({
    personName: z.string().min(1),
    amount: z.number().positive(),
  }),
  async run({ personName, amount }, { request }) {
    const payee = await database.payees.findPayeeByName(personName);
    const person = payee ?? { id: "", name: personName, email: null, note: null, trusted: false, createdAt: "" };
    const check = await checkPaymentRules(request, person, amount);
    return { summary: `${verdictLabel[check.verdict]}: ${check.explanation}`, data: check };
  },
});

const verdictLabel = { allowed: "Allowed", needs_approval: "Needs your approval", blocked: "Blocked" } as const;
