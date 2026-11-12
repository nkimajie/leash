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

/**
 * A purchase on its way. The stores in this sandbox demo don't really ship, so a stand-in store
 * does: it picks the carrier and tracking number, and Leash adds them to the real PayPal order.
 */
export const ShippingSchema = z.object({
  carrier: z.string(),
  trackingNumber: z.string(),
  /** From your saved PayPal account, e.g. "Sam Lee, 1 Main St, Lisbon, 1000-001, PT". */
  shipTo: z.string().nullable(),
  shippedAt: z.string(),
  arrivesBy: z.string(),
  /** True once PayPal has the tracking on its order. */
  onPayPalOrder: z.boolean(),
});
export type Shipping = z.infer<typeof ShippingSchema>;

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
  /** Purchases only, once paid and shipped. */
  shipping: ShippingSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Decision = z.infer<typeof DecisionSchema>;

/** The sample history every new account starts with. It was never sent to PayPal, so nobody can act on it. */
export const SAMPLE_HISTORY_REQUEST_ID = "sample-history";
export const isSampleHistory = (decision: Pick<Decision, "requestId">) =>
  decision.requestId === SAMPLE_HISTORY_REQUEST_ID;
/** A new decision hasn't shipped yet: shipping is added once the money is taken. */
export type NewDecision = Omit<Decision, "id" | "createdAt" | "updatedAt" | "shipping">;

/** How long a held purchase or payment waits for you before Leash releases the reserved money. */
export const DAYS_TO_ANSWER = 7;

/**
 * How long PayPal keeps an authorization (money reserved, not taken) open: 29 days.
 * PayPal only promises the money for the first 3 days (its "honour period"); after that a capture
 * usually still works but isn't guaranteed. Leash never gets close: it releases holds after DAYS_TO_ANSWER.
 */
export const PAYPAL_AUTHORIZATION_DAYS = 29;
