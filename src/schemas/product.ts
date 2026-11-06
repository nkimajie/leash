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
});

export type Product = z.infer<typeof ProductSchema>;
