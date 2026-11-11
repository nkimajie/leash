// Human-readable labels and colours for outcomes and rules.

import { isSampleHistory, type Decision, type Outcome, type QuickReason, type RuleName } from "@/schemas";

export const OUTCOME_STYLE: Record<Outcome, { label: string; tone: string; dot: string }> = {
  auto_approved: {
    label: "Paid automatically",
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  approved: { label: "Approved by you", tone: "bg-teal-50 text-teal-700 ring-teal-600/20", dot: "bg-teal-500" },
  held: { label: "Waiting for you", tone: "bg-amber-50 text-amber-800 ring-amber-600/30", dot: "bg-amber-500" },
  denied: { label: "Denied, not charged", tone: "bg-stone-100 text-stone-600 ring-stone-500/20", dot: "bg-stone-400" },
  blocked: { label: "Blocked by rules", tone: "bg-stone-100 text-stone-600 ring-stone-500/20", dot: "bg-stone-400" },
  refunded: { label: "Refunded", tone: "bg-sky-50 text-sky-700 ring-sky-600/20", dot: "bg-sky-500" },
  failed: { label: "Payment failed", tone: "bg-rose-50 text-rose-700 ring-rose-600/20", dot: "bg-rose-500" },
};

export const RULE_LABEL: Record<RuleName, string> = {
  within_rules: "Within rules",
  auto_approve_limit: "Over auto-approve limit",
  request_budget: "Over request budget",
  off_request: "Not what you asked for",
  new_person: "New person",
  no_paypal_email: "No PayPal email yet",
  scheduled_restock: "Scheduled restock",
  max_item_price: "Over max item price",
  max_payment_per_person: "Over per-person limit",
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
  not_needed: "Didn't need it",
  wrong_store: "Wrong store",
  not_my_taste: "Not my taste",
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
  open_page: "Opening the page",
};

/** Where the money is at PayPal, in plain words. The control room shows PayPal's own status underneath. */
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
