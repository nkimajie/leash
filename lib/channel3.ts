// Product search. Mock mode (no CHANNEL3_API_KEY) searches a small built-in catalog.
// The real Channel3 call is added later; the function signature stays the same.

import type { Product } from "./types";

export const channel3IsMock = !process.env.CHANNEL3_API_KEY;

export type SearchInput = { query: string; maxPrice?: number; limit?: number };

export async function searchProducts({ query, maxPrice, limit = 5 }: SearchInput): Promise<Product[]> {
  // TODO(step 5): call Channel3 when CHANNEL3_API_KEY is set.
  return searchMockCatalog(query, maxPrice, limit);
}

// Merchants and products are invented sample data, not real stores.
export const MOCK_CATALOG: Product[] = [
  p("cof-1", "Fair-trade whole bean coffee, medium roast, 340 g", 14.0, "Bean & Leaf Market", "coffee"),
  p("cof-2", "Fair-trade organic espresso beans, 1 kg", 32.5, "Bean & Leaf Market", "coffee"),
  p("cof-3", "Single-origin light roast beans, 250 g", 18.0, "Roastery Row", "coffee"),
  p("cof-4", "Conical burr coffee grinder, 40 settings", 85.0, "Kitchen Depot", "coffee equipment"),
  p("cof-5", "Unbleached paper coffee filters, 200 pack", 6.5, "Kitchen Depot", "coffee equipment"),
  p("cof-6", "Pour-over dripper, ceramic", 24.0, "Roastery Row", "coffee equipment"),
  p("cof-7", "Coffee shop gift card, $100", 100.0, "Gift Hub", "gift cards"),
  p("off-1", "Recycled printer paper, 500 sheets", 9.0, "Desk Supply Co.", "office supplies"),
  p("off-2", "Gel pens, black, 12 pack", 11.5, "Desk Supply Co.", "office supplies"),
  p("off-3", "Ergonomic office chair, mesh back", 189.0, "Workspace Outlet", "furniture"),
  p("off-4", "Sticky notes, 24 pads", 13.0, "Desk Supply Co.", "office supplies"),
  p("pet-1", "Grain-free dry dog food, 5 kg", 38.0, "Pet Pantry", "pet supplies"),
  p("pet-2", "Compostable dog waste bags, 300 count", 12.0, "Pet Pantry", "pet supplies"),
  p("pet-3", "Orthopedic dog bed, large", 72.0, "Pet Pantry", "pet supplies"),
  p("kit-1", "Dish soap refill, 2 L", 8.5, "Green Home Goods", "household"),
  p("kit-2", "Reusable beeswax food wraps, 6 pack", 19.0, "Green Home Goods", "household"),
  p("kit-3", "Stainless steel water bottle, 750 ml", 27.0, "Green Home Goods", "household"),
  p("kit-4", "Cordless stick vacuum", 149.0, "Kitchen Depot", "appliances"),
];

function p(id: string, title: string, price: number, merchant: string, category: string): Product {
  return { id, title, price, currency: "USD", merchant, category, url: `https://example.com/products/${id}` };
}

const STOP_WORDS = new Set(["my", "the", "a", "an", "and", "for", "of", "to", "under", "only", "with", "some", "me", "buy", "get", "restock"]);

function searchMockCatalog(query: string, maxPrice: number | undefined, limit: number): Product[] {
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .map((w) => w.replace(/s$/, "")); // crude singular: "beans" -> "bean"

  const scored = MOCK_CATALOG.map((product) => {
    const haystack = `${product.title} ${product.category}`.toLowerCase();
    const score = words.filter((w) => haystack.includes(w)).length;
    return { product, score };
  })
    .filter(({ product, score }) => score > 0 && (maxPrice === undefined || product.price <= maxPrice))
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price);

  return scored.slice(0, limit).map((s) => s.product);
}
