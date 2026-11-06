import "server-only";

import { z } from "zod";
import * as database from "@/server/database";
import { searchProducts } from "@/server/products/product-search";
import { findReasonToAvoid, findReasonToLike } from "@/server/twin/learn-preferences";
import { defineTool } from "./define-tool";

export const searchProductsTool = defineTool({
  name: "search_products",
  description:
    "Search real products to buy. Results include notes from the user's digital twin: things they like, and things they avoid (never buy an avoided product).",
  inputSchema: z.object({
    query: z.string().min(2).describe("What to search for, e.g. 'fair-trade coffee beans'"),
    maxPrice: z.number().positive().optional().describe("Only return products at or below this price"),
  }),
  async run({ query, maxPrice }) {
    const [products, preferences] = await Promise.all([
      searchProducts(query, { maxPrice, limit: 4 }),
      database.preferences.listPreferences(),
    ]);
    if (products.length === 0) return { summary: "No products found.", data: [] };

    const results = products.map((product) => ({
      ...product,
      twinAvoids: findReasonToAvoid(product, preferences)?.statement ?? null,
      twinLikes: findReasonToLike(product, preferences)?.statement ?? null,
    }));

    const summary = results
      .map(
        (p) => `${p.title}: $${p.price.toFixed(2)} (${p.merchant})${p.twinAvoids ? "  [your twin avoids this]" : ""}`,
      )
      .join("\n");
    return { summary, data: results };
  },
});
