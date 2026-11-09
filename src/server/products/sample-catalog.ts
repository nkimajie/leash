// Sample products used when no Channel3 key is set.
// Merchants and products are invented, not real stores.

import type { Product } from "@/schemas";

function sampleProduct(id: string, title: string, price: number, merchant: string, category: string): Product {
  return {
    id,
    title,
    price,
    currency: "USD",
    merchant,
    category,
    url: `https://example.com/products/${id}`,
    source: "sample",
  };
}

export const SAMPLE_CATALOG: Product[] = [
  sampleProduct("cof-1", "Fair-trade whole bean coffee, medium roast, 340 g", 14.0, "Bean & Leaf Market", "coffee"),
  sampleProduct("cof-2", "Fair-trade organic espresso beans, 1 kg", 32.5, "Bean & Leaf Market", "coffee"),
  sampleProduct("cof-3", "Single-origin light roast beans, 250 g", 18.0, "Roastery Row", "coffee"),
  sampleProduct("cof-4", "Conical burr coffee grinder, 40 settings", 85.0, "Kitchen Depot", "coffee equipment"),
  sampleProduct("cof-8", "Manual hand coffee grinder, ceramic burr", 34.0, "Roastery Row", "coffee equipment"),
  sampleProduct("cof-5", "Unbleached paper coffee filters, 200 pack", 6.5, "Kitchen Depot", "coffee equipment"),
  sampleProduct("cof-6", "Pour-over dripper, ceramic", 24.0, "Roastery Row", "coffee equipment"),
  sampleProduct("cof-7", "Coffee shop gift card, $100", 100.0, "Gift Hub", "gift cards"),
  sampleProduct("off-1", "Recycled printer paper, 500 sheets", 9.0, "Desk Supply Co.", "office supplies"),
  sampleProduct("off-2", "Gel pens, black, 12 pack", 11.5, "Desk Supply Co.", "office supplies"),
  sampleProduct("off-3", "Ergonomic office chair, mesh back", 189.0, "Workspace Outlet", "furniture"),
  sampleProduct("off-4", "Sticky notes, 24 pads", 13.0, "Desk Supply Co.", "office supplies"),
  sampleProduct("pet-1", "Grain-free dry dog food, 5 kg", 38.0, "Pet Pantry", "pet supplies"),
  sampleProduct("pet-2", "Compostable dog waste bags, 300 count", 12.0, "Pet Pantry", "pet supplies"),
  sampleProduct("pet-3", "Orthopedic dog bed, large", 72.0, "Pet Pantry", "pet supplies"),
  sampleProduct("kit-1", "Dish soap refill, 2 L", 8.5, "Green Home Goods", "household"),
  sampleProduct("kit-2", "Reusable beeswax food wraps, 6 pack", 19.0, "Green Home Goods", "household"),
  sampleProduct("kit-3", "Stainless steel water bottle, 750 ml", 27.0, "Green Home Goods", "household"),
  sampleProduct("kit-4", "Cordless stick vacuum", 149.0, "Kitchen Depot", "appliances"),
];

const IGNORED_WORDS = new Set([
  "my",
  "the",
  "a",
  "an",
  "and",
  "for",
  "of",
  "to",
  "under",
  "only",
  "with",
  "some",
  "me",
  "buy",
  "get",
  "restock",
  "need",
  "needs",
  "want",
  "please",
  "new",
]);

/** Simple keyword search: best match first, cheapest first among equal matches. */
export function searchSampleCatalog(query: string, maxPrice?: number): Product[] {
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((word) => word.length > 2 && !IGNORED_WORDS.has(word))
    .map((word) => word.replace(/s$/, "")); // "beans" -> "bean"

  return SAMPLE_CATALOG.map((product) => {
    const text = `${product.title} ${product.category}`.toLowerCase();
    return { product, matches: words.filter((word) => text.includes(word)).length };
  })
    .filter(({ product, matches }) => matches > 0 && (maxPrice === undefined || product.price <= maxPrice))
    .sort((a, b) => b.matches - a.matches || a.product.price - b.product.price)
    .map(({ product }) => product);
}
