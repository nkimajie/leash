// The leash: a pure rule engine. No I/O, so it is easy to test and easy to read.
//
// Rules come in two strengths:
//   hard rules  -> "blocked"         (PayPal is never called)
//   soft rules  -> "needs_approval"  (PayPal authorizes and HOLDS; a human decides)
// Anything that passes both is "auto_approve" (authorize + capture).

import type { PolicyResult, Product, Rules, SpendContext, Verdict } from "./types";

export const DEFAULT_RULES: Rules = {
  currency: "USD",
  goalBudget: 100,
  maxItemPrice: 200,
  dailyCap: 250,
  weeklyCap: 500,
  autoApproveLimit: 50,
  allowedCategories: [],
  blockedCategories: ["alcohol", "tobacco", "gift cards", "weapons"],
  allowedMerchants: [],
  blockedMerchants: [],
};

// Verdicts whose money counts against budgets and caps. Held money is reserved.
export const COMMITTED_VERDICTS: Verdict[] = ["auto_captured", "approved", "held"];

const money = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

const norm = (s: string) => s.trim().toLowerCase();
const listHas = (list: string[], value: string) => list.some((x) => norm(x) === norm(value));

type Item = Pick<Product, "title" | "price" | "currency" | "merchant" | "category">;

export function checkPolicy(item: Item, rules: Rules, ctx: SpendContext): PolicyResult {
  const blocked = (rule_hit: string, explanation: string): PolicyResult => ({
    verdict: "blocked",
    rule_hit,
    explanation,
  });
  const fmt = (n: number) => money(n, rules.currency);

  // ---- Hard rules ----
  if (!Number.isFinite(item.price) || item.price <= 0) {
    return blocked("invalid_price", `"${item.title}" has no valid price.`);
  }
  if (norm(item.currency) !== norm(rules.currency)) {
    return blocked(
      "currency_mismatch",
      `Priced in ${item.currency}, but your wallet only spends ${rules.currency}.`,
    );
  }
  if (listHas(rules.blockedMerchants, item.merchant)) {
    return blocked("blocked_merchant", `You blocked the merchant "${item.merchant}".`);
  }
  if (rules.allowedMerchants.length > 0 && !listHas(rules.allowedMerchants, item.merchant)) {
    return blocked(
      "merchant_not_allowed",
      `"${item.merchant}" is not on your list of allowed merchants.`,
    );
  }
  if (listHas(rules.blockedCategories, item.category)) {
    return blocked("blocked_category", `You blocked the category "${item.category}".`);
  }
  if (rules.allowedCategories.length > 0 && !listHas(rules.allowedCategories, item.category)) {
    return blocked(
      "category_not_allowed",
      `"${item.category}" is not one of your allowed categories.`,
    );
  }
  if (item.price > rules.maxItemPrice) {
    return blocked(
      "max_item_price",
      `${fmt(item.price)} is over your ${fmt(rules.maxItemPrice)} per-item maximum.`,
    );
  }
  if (ctx.spentThisWeek + item.price > rules.weeklyCap) {
    return blocked(
      "weekly_cap",
      `Would bring this week's spending to ${fmt(ctx.spentThisWeek + item.price)}, over your ${fmt(rules.weeklyCap)} weekly cap.`,
    );
  }
  if (ctx.spentToday + item.price > rules.dailyCap) {
    return blocked(
      "daily_cap",
      `Would bring today's spending to ${fmt(ctx.spentToday + item.price)}, over your ${fmt(rules.dailyCap)} daily cap.`,
    );
  }

  // ---- Soft rules: a human can still say yes ----
  const reasons: { rule: string; text: string }[] = [];
  if (item.price > rules.autoApproveLimit) {
    reasons.push({
      rule: "auto_approve_limit",
      text: `${fmt(item.price)} is over your ${fmt(rules.autoApproveLimit)} auto-approve limit.`,
    });
  }
  if (ctx.goalSpent + item.price > ctx.goalBudget) {
    reasons.push({
      rule: "goal_budget",
      text: `Would bring this goal to ${fmt(ctx.goalSpent + item.price)}, over its ${fmt(ctx.goalBudget)} budget.`,
    });
  }
  if (reasons.length > 0) {
    return {
      verdict: "needs_approval",
      rule_hit: reasons[0].rule,
      explanation: reasons.map((r) => r.text).join(" ") + " Holding it for your approval.",
    };
  }

  return {
    verdict: "auto_approve",
    rule_hit: "within_rules",
    explanation: `${fmt(item.price)} is within every rule, so it can be bought without asking.`,
  };
}

// Build the SpendContext from past decisions. Kept here so the maths is tested with the rules.
export function spendContext(
  decisions: { goal_id: string; price: number; verdict: Verdict; created_at: string }[],
  goalId: string,
  goalBudget: number,
  now: Date = new Date(),
): SpendContext {
  const committed = decisions.filter((d) => COMMITTED_VERDICTS.includes(d.verdict));
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sum = (list: typeof committed) => list.reduce((total, d) => total + d.price, 0);

  return {
    goalBudget,
    goalSpent: sum(committed.filter((d) => d.goal_id === goalId)),
    spentToday: sum(committed.filter((d) => new Date(d.created_at) >= startOfDay)),
    spentThisWeek: sum(committed.filter((d) => new Date(d.created_at) >= weekAgo)),
  };
}
