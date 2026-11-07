import "server-only";

// Product search. Uses Channel3 when CHANNEL3_API_KEY is set, otherwise the sample catalog.
// If Channel3 is down, the sample catalog answers instead, so the assistant never gets stuck.

import type { Product } from "@/schemas";
import { serviceModes } from "@/server/config/environment";
import { searchChannel3 } from "./channel3";
import { SAMPLE_CATALOG, searchSampleCatalog } from "./sample-catalog";

// Products seen in recent searches, so the assistant can refer to them by id later.
const recentlySeenProducts = new Map<string, Product>(SAMPLE_CATALOG.map((p) => [p.id, p]));

export async function searchProducts(query: string, options: { maxPrice?: number; limit?: number } = {}) {
  const limit = options.limit ?? 5;
  const products =
    serviceModes().productSearch === "channel3"
      ? await searchChannel3(query, { maxPrice: options.maxPrice, limit }).catch((error) => {
          console.warn("Channel3 search failed, using the sample catalog", error);
          return searchSampleCatalog(query, options.maxPrice).slice(0, limit);
        })
      : searchSampleCatalog(query, options.maxPrice).slice(0, limit);

  products.forEach((p) => recentlySeenProducts.set(p.id, p));
  return products;
}

export function findProductById(id: string): Product | null {
  return recentlySeenProducts.get(id) ?? null;
}
