import { z } from "zod";
import { DecisionKindSchema, OutcomeSchema } from "./decision";

/**
 * What the Money grid should show, worked out from a question in plain English
 * ("held payments over $50, biggest first"). Every field is optional: null means "don't filter".
 */
export const GridViewSchema = z.object({
  outcomes: z.array(OutcomeSchema).nullable(),
  kind: DecisionKindSchema.nullable(),
  minAmount: z.number().nullable(),
  maxAmount: z.number().nullable(),
  /** Words to look for in the item, person, store, category or the AI's reasoning. */
  searchText: z.string().nullable(),
  /** Only show the last N days. */
  sinceDays: z.number().nullable(),
  sortBy: z.enum(["createdAt", "amount"]).nullable(),
  sortDirection: z.enum(["asc", "desc"]).nullable(),
  /** The view in a few words, shown above the grid, e.g. "Held payments over $50, biggest first". */
  summary: z.string(),
});

export type GridView = z.infer<typeof GridViewSchema>;

export const AskControlRoomBody = z.object({
  question: z.string().trim().min(2, "Ask something about your money.").max(200),
});
