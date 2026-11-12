// Human-readable labels and colours for outcomes and rules.

import { isSampleHistory, type Decision, type Outcome, type QuickReason, type RuleName } from "@/schemas";

/** The stamp colours, one per money state (the tokens are in globals.css). */
export type StampTone = "paid" | "reserved" | "released" | "blocked" | "refunded" | "failed";

export const STAMP_TONE_CLASSES: Record<StampTone, string> = {
  paid: "bg-paid-wash text-paid",
  reserved: "bg-reserved-wash text-reserved",
  released: "bg-sand text-ink-faint",
  blocked: "bg-ink text-white",
  refunded: "bg-refunded-wash text-refunded",
  failed: "bg-failed-wash text-failed",
};

/** Every amount is stamped with what happened to the money, and what PayPal did. */
export const OUTCOME_STYLE: Record<Outcome, { label: string; paypal: string; tone: StampTone }> = {
  auto_approved: { label: "Paid", paypal: "PayPal captured", tone: "paid" },
  approved: { label: "Paid", paypal: "PayPal captured", tone: "paid" },
  held: { label: "Reserved", paypal: "PayPal authorized", tone: "reserved" },
  denied: { label: "Released", paypal: "PayPal released", tone: "released" },
  blocked: { label: "Blocked", paypal: "PayPal never called", tone: "blocked" },
  refunded: { label: "Refunded", paypal: "PayPal refunded", tone: "refunded" },
  failed: { label: "Failed", paypal: "PayPal couldn't finish", tone: "failed" },
};

/** What happened, in one plain sentence: notifications and receipts. */
export const OUTCOME_SENTENCE: Record<Outcome, string> = {
  auto_approved: "Within your rules, so PayPal paid it straight away.",
  approved: "You approved it. PayPal took care of the payment.",
  held: "PayPal reserved the money. Nothing is taken until you say yes.",
  denied: "PayPal released the hold. You weren't charged.",
  blocked: "Leash stopped it before PayPal was ever called.",
  refunded: "The money is back in your PayPal.",
  failed: "PayPal couldn't finish the payment.",
};

/** The receipt's last line: what PayPal did, step by step. "PayPal · authorized → awaiting you". */
export function paypalTrail(decision: Decision): string {
  if (isSampleHistory(decision)) return "Sample history · never sent to PayPal";
  const paidOut = decision.paypal.payoutId ? " → paid out" : "";
  const shipped = decision.shipping?.onPayPalOrder ? " → tracking added" : "";
  switch (decision.outcome) {
    case "auto_approved":
    case "approved":
      return `PayPal · authorized → captured${paidOut}${shipped}`;
    case "held":
      return "PayPal · authorized → awaiting you";
    case "denied":
      return "PayPal · authorized → released";
    case "blocked":
      return "PayPal · never called";
    case "refunded":
      return "PayPal · captured → refunded";
    case "failed":
      return decision.paypal.authorizationId ? "PayPal · authorized → couldn't finish" : "PayPal · declined";
  }
}

/** The same colours as plain CSS, for the Bryntum timelines. */
export const OUTCOME_COLOR: Record<Outcome, string> = {
  auto_approved: "#1f8a4c",
  approved: "#1f8a4c",
  held: "#b7791f",
  denied: "#7a776f",
  blocked: "#14130f",
  refunded: "#2563c9",
  failed: "#c23a55",
};

export const RULE_LABEL: Record<RuleName, string> = {
  within_rules: "Within rules",
  auto_approve_limit: "Over your pay-without-asking limit",
  request_budget: "Over request budget",
  off_request: "Not what you asked for",
  new_person: "New person",
  no_paypal_email: "No PayPal email yet",
  scheduled_restock: "Scheduled restock",
  max_item_price: "Over your hard limit",
  max_payment_per_person: "Over your limit for one person",
  daily_cap: "Daily cap reached",
  weekly_cap: "Weekly cap reached",
  blocked_category: "Blocked category",
  category_not_allowed: "Category not allowed",
  blocked_merchant: "Blocked merchant",
  merchant_not_allowed: "Merchant not allowed",
  currency_mismatch: "Wrong currency",
  invalid_amount: "Invalid amount",
  payment_declined: "Card declined",
  payment_error: "PayPal error",
  paypal_not_connected: "PayPal not connected",
};

export const QUICK_REASON_LABEL: Record<QuickReason, string> = {
  too_expensive: "Too expensive",
  not_my_taste: "Not quite right",
  not_needed: "Already have one",
  not_now: "Not now",
  wrong_store: "Wrong store",
};

export const TOOL_LABEL: Record<string, string> = {
  search_products: "Searching products",
  check_purchase_rules: "Checking your rules",
  check_payment_rules: "Checking your rules",
  buy_product: "Paying with PayPal",
  pay_person: "Sending with PayPal",
  schedule_restock: "Scheduling a restock",
  recall_preferences: "Recalling what you like",
  remember_preference: "Remembering",
  read_my_leash: "Checking your account",
  look_up_spending: "Adding up your spending",
  deny_held_item: "Denying it with PayPal",
  refund_purchase: "Refunding with PayPal",
  track_orders: "Tracking your orders",
  open_page: "Opening the page",
};

/** Where the money is at PayPal, in plain words. The receipt shows PayPal's own status underneath. */
export function paypalStatusInWords(decision: Decision): string {
  if (isSampleHistory(decision)) return "Sample only";
  const status = decision.paypal.status;
  if (!status) return "Never called";
  if (status === "COMPLETED" && decision.paypal.payoutId) return "Taken, sent on";
  return PAYPAL_STATUS_IN_WORDS[status] ?? "PayPal error";
}

const PAYPAL_STATUS_IN_WORDS: Record<string, string> = {
  CREATED: "Reserved",
  AUTHORIZED: "Reserved",
  PENDING: "Being taken",
  COMPLETED: "Taken",
  VOIDED: "Released",
  REFUNDED: "Refunded",
  DECLINED: "Declined",
  PAYPAL_NOT_CONNECTED: "Not connected",
  // Payments to people, once Payouts reports back
  SUCCESS: "Received",
  UNCLAIMED: "Sent, not claimed yet",
  FAILED: "Payout failed",
  RETURNED: "Payout returned",
  BLOCKED: "Payout blocked",
  REFUND_FAILED: "Refund failed",
};
