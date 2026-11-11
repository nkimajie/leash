import { z } from "zod";

/** A product found by search (Channel3, or the built-in sample catalog in mock mode). */
export const ProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.number(),
  currency: z.string(),
  merchant: z.string(),
  category: z.string(),
  url: z.string().optional(),
  imageUrl: z.string().optional(),
  /** Where it was found: real stores through Channel3, or Leash's built-in sample catalog. */
  source: z.enum(["channel3", "sample"]),
  /** Channel3 only: how many stores had it in stock (the price is the cheapest of them). */
  storesCompared: z.number().optional(),
});

export type Product = z.infer<typeof ProductSchema>;

/** A search result, with what your digital twin thinks of it. */
export const SearchResultSchema = ProductSchema.extend({
  twinAvoids: z
    .string()
    .nullable()
    .describe("Why the person's digital twin avoids this product, if it does. Never buy these."),
  twinLikes: z.string().nullable().describe("What the person likes about it, if anything"),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;
