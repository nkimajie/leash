import { z } from "zod";

/**
 * A request the assistant repeats on a schedule, e.g. "Restock dog food" every 30 days.
 * Anything a restock buys is held for your approval, because you aren't there to watch.
 */
export const RestockSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  everyDays: z.number().int(),
  nextRunAt: z.string(),
  lastRunAt: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string(),
});

export type Restock = z.infer<typeof RestockSchema>;

export const NewRestockSchema = z.object({
  prompt: z.string().trim().min(3, "Say what to restock.").max(300),
  everyDays: z.number().int().min(1).max(365),
});

export type NewRestock = z.infer<typeof NewRestockSchema>;

export const RestockChangesSchema = NewRestockSchema.partial().extend({
  active: z.boolean().optional(),
  /** Move the next run, e.g. by dragging it on the timeline. Later runs follow on from it. */
  nextRunAt: z.iso.datetime().optional(),
});
export type RestockChanges = z.infer<typeof RestockChangesSchema>;
