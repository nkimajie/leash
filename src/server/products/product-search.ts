import "server-only";

// Product search. Uses Channel3 when CHANNEL3_API_KEY is set, otherwise the sample catalog.

import type { Product } from "@/schemas";
import { SAMPLE_CATALOG, searchSampleCatalog } from "./sample-catalog";

// Products seen in recent searches, so the assistant can refer to them by id later.
const recentlySeenProducts = new Map<string, Product>(SAMPLE_CATALOG.map((p) => [p.id, p]));

export async function searchProducts(query: string, options: { maxPrice?: number; limit?: number } = {}) {
  const limit = options.limit ?? 5;
  // TODO(step 5): call Channel3 when CHANNEL3_API_KEY is set.
  const products = searchSampleCatalog(query, options.maxPrice).slice(0, limit);
  products.forEach((p) => recentlySeenProducts.set(p.id, p));
  return products;
}

export function findProductById(id: string): Product | null {
  return recentlySeenProducts.get(id) ?? null;
}
