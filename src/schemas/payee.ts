import { z } from "zod";

/** A person the assistant can send money to. */
export const PayeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** PayPal account email. Needed before real money can be sent. */
  email: z.string().nullable(),
  /** What this person is to you, e.g. "babysitter". */
  note: z.string().nullable(),
  /** Trusted people can be paid without asking, up to the auto-approve limit. */
  trusted: z.boolean(),
  createdAt: z.string(),
});

export type Payee = z.infer<typeof PayeeSchema>;

export const NewPayeeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email().nullable().default(null),
  note: z.string().trim().max(120).nullable().default(null),
  trusted: z.boolean().default(false),
});

export type NewPayee = z.input<typeof NewPayeeSchema>;

export const PayeeChangesSchema = NewPayeeSchema.partial();
export type PayeeChanges = z.infer<typeof PayeeChangesSchema>;
