import { z } from "zod";
import { ProductSchema } from "./product";
import { RULE_NAMES } from "./spending-rules";

export const DecisionKindSchema = z.enum(["purchase", "payment"]);
export type DecisionKind = z.infer<typeof DecisionKindSchema>;

/**
 * What happened to the money.
 *   auto_approved  within every rule: PayPal authorized and captured
 *   held           authorized (money reserved) and waiting for you
 *   approved       you said yes: captured
 *   denied         you said no: authorization voided, money never taken
 *   blocked        a hard rule said no: PayPal was never called
 *   refunded       captured, then refunded
 *   failed         PayPal returned an error (e.g. card declined)
 */
export const OutcomeSchema = z.enum(["auto_approved", "held", "approved", "denied", "blocked", "refunded", "failed"]);
export type Outcome = z.infer<typeof OutcomeSchema>;

/** Outcomes whose money counts against budgets and caps (held money is reserved). */
export const COMMITTED_OUTCOMES: Outcome[] = ["auto_approved", "approved", "held"];

export const PayPalRecordSchema = z.object({
  orderId: z.string().nullable(),
  authorizationId: z.string().nullable(),
  captureId: z.string().nullable(),
  status: z.string().nullable(),
  /** PayPal's debug_id for errors, so a failure can be traced in PayPal's logs. */
  debugId: z.string().nullable(),
  /** Payments to a person: the PayPal Payouts batch that sent the money on to them. */
  payoutId: z.string().nullable(),
});
export type PayPalRecord = z.infer<typeof PayPalRecordSchema>;

/** One thing the assistant tried to pay for, and what happened. A row in the control room. */
export const DecisionSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  kind: DecisionKindSchema,
  /** Product title, or "Payment to Sam". */
  title: z.string(),
  /** Merchant for purchases, person for payments. */
  counterparty: z.string(),
  category: z.string().nullable(),
  amount: z.number(),
  currency: z.string(),
  outcome: OutcomeSchema,
  ruleHit: z.enum(RULE_NAMES),
  ruleExplanation: z.string(),
  aiReasoning: z.string(),
  product: ProductSchema.nullable(),
  payee: z.object({ id: z.string(), name: z.string(), email: z.string().nullable() }).nullable(),
  paypal: PayPalRecordSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Decision = z.infer<typeof DecisionSchema>;

/** The sample history every new account starts with. It was never sent to PayPal, so nobody can act on it. */
export const SAMPLE_HISTORY_REQUEST_ID = "sample-history";
export const isSampleHistory = (decision: Pick<Decision, "requestId">) =>
  decision.requestId === SAMPLE_HISTORY_REQUEST_ID;
export type NewDecision = Omit<Decision, "id" | "createdAt" | "updatedAt">;
