import "server-only";

import { z } from "zod";
import { findProductById } from "@/server/products/product-search";
import { buyProduct } from "@/server/spending/spending-service";
import { defineTool } from "./define-tool";

export const buyProductTool = defineTool({
  name: "buy_product",
  description:
    "Buy a product with the user's PayPal. The spending rules are applied automatically: it is paid now, held for the user's approval, or blocked. Always explain why you chose it.",
  inputSchema: z.object({
    productId: z.string().describe("The id from search_products"),
    reasoning: z
      .string()
      .min(10)
      .describe("One or two sentences, in plain English, on why this product fits the request"),
  }),
  async run({ productId, reasoning }, { request }) {
    const product = findProductById(productId);
    if (!product) return { summary: `No product with id ${productId}. Search first.` };
    const decision = await buyProduct(request, product, reasoning);
    return { summary: `${decision.outcome}: ${decision.ruleExplanation}`, decision };
  },
});
