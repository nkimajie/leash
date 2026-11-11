import "server-only";

import { z } from "zod";
import type { SearchResult } from "@/schemas";
import { serviceModes } from "@/server/config/environment";
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
    const results = await searchWithTwinNotes(query, maxPrice);
    if (results.length === 0) return { summary: "No products found.", data: [] };

    const found = results
      .map(
        (p) => `${p.title}: $${p.price.toFixed(2)} (${p.merchant})${p.twinAvoids ? "  [your twin avoids this]" : ""}`,
      )
      .join("\n");
    return { summary: `${whereFrom(results)}:\n${found}`, data: results, products: results };
  },
});

/** Says where results came from, including when Channel3 didn't answer and the sample catalog stood in. */
/** Up to four products, each with what your digital twin thinks of it. Also used by the Leash API. */
export async function searchWithTwinNotes(query: string, maxPrice?: number): Promise<SearchResult[]> {
  const [products, preferences] = await Promise.all([
    searchProducts(query, { maxPrice, limit: 4 }),
    database.preferences.listPreferences(),
  ]);
  return products.map((product) => ({
    ...product,
    twinAvoids: findReasonToAvoid(product, preferences)?.statement ?? null,
    twinLikes: findReasonToLike(product, preferences)?.statement ?? null,
  }));
}

function whereFrom(results: SearchResult[]): string {
  if (results[0].source === "channel3") return "Found with Channel3";
  return serviceModes().productSearch === "channel3"
    ? "Channel3 didn't answer, so these are from the sample catalog"
    : "From the sample catalog";
}
