import { z } from "zod";

/**
 * Something your digital twin knows about you.
 * Optional matchers (category, merchant, productId, priceAtLeast) let the assistant
 * apply it to products automatically; the statement is what a person reads.
 */
export const PreferenceSchema = z.object({
  id: z.string(),
  sentiment: z.enum(["likes", "avoids"]),
  statement: z.string(),
  category: z.string().nullable(),
  merchant: z.string().nullable(),
  productId: z.string().nullable(),
  priceAtLeast: z.number().nullable(),
  /** "you" = you told it; "learned" = it learned from an approve, deny or refund. */
  source: z.enum(["you", "learned"]),
  learnedFromDecisionId: z.string().nullable(),
  createdAt: z.string(),
});

export type Preference = z.infer<typeof PreferenceSchema>;

export const NewPreferenceSchema = z.object({
  sentiment: z.enum(["likes", "avoids"]),
  statement: z.string().trim().min(3).max(240),
  category: z.string().trim().min(1).nullable().default(null),
  merchant: z.string().trim().min(1).nullable().default(null),
  productId: z.string().nullable().default(null),
  priceAtLeast: z.number().positive().nullable().default(null),
  source: z.enum(["you", "learned"]).default("you"),
  learnedFromDecisionId: z.string().nullable().default(null),
});

export type NewPreference = z.input<typeof NewPreferenceSchema>;
