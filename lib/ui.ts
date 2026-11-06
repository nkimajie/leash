// Display helpers shared by client components. No secrets, no server imports.

import type { Verdict } from "./types";

export const VERDICT: Record<Verdict, { label: string; className: string }> = {
  auto_captured: { label: "Auto-captured", className: "bg-emerald-100 text-emerald-800 ring-emerald-600/20" },
  approved: { label: "Approved", className: "bg-teal-100 text-teal-800 ring-teal-600/20" },
  held: { label: "Held", className: "bg-amber-100 text-amber-900 ring-amber-600/30" },
  denied: { label: "Blocked", className: "bg-stone-200 text-stone-700 ring-stone-500/20" },
  voided: { label: "Voided", className: "bg-slate-200 text-slate-700 ring-slate-500/20" },
  refunded: { label: "Refunded", className: "bg-sky-100 text-sky-800 ring-sky-600/20" },
  failed: { label: "Failed", className: "bg-rose-100 text-rose-800 ring-rose-600/20" },
};

export const RULE_LABEL: Record<string, string> = {
  within_rules: "Within rules",
  auto_approve_limit: "Over auto-approve limit",
  goal_budget: "Over goal budget",
  max_item_price: "Over max item price",
  daily_cap: "Daily cap",
  weekly_cap: "Weekly cap",
  blocked_category: "Blocked category",
  category_not_allowed: "Category not allowed",
  blocked_merchant: "Blocked merchant",
  merchant_not_allowed: "Merchant not allowed",
  currency_mismatch: "Wrong currency",
  invalid_price: "Invalid price",
  INSTRUMENT_DECLINED: "Card declined",
};

export const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
