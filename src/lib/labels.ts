// Human-readable labels and colours for outcomes and rules.

import type { Outcome, RuleName } from "@/schemas";

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
  new_person: "New person",
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
};

export const TOOL_LABEL: Record<string, string> = {
  search_products: "Searching products",
  check_purchase_rules: "Checking your rules",
  check_payment_rules: "Checking your rules",
  buy_product: "Paying with PayPal",
  pay_person: "Sending with PayPal",
  recall_preferences: "Recalling what you like",
  remember_preference: "Remembering",
};
