// The rule engine. Pure functions with no database or network calls, so they are easy
// to test and easy to read.
//
// Rules come in two strengths:
//   hard rules -> "blocked"         PayPal is never called
//   soft rules -> "needs_approval"  PayPal reserves the money and you decide
// Anything that passes both is "allowed": PayPal reserves and takes the money.

import type { Outcome, RuleCheck, RuleName, SpendingRules } from "@/schemas";
import { COMMITTED_OUTCOMES } from "@/schemas";

/** Money already committed (paid or reserved) when a new purchase or payment is checked. */
export type SpendingSoFar = {
  requestBudget: number;
  spentOnRequest: number;
  spentToday: number;
  spentThisWeek: number;
};

export type PurchaseToCheck = { title: string; amount: number; currency: string; merchant: string; category: string };
export type PaymentToCheck = { personName: string; amount: number; currency: string; personIsTrusted: boolean };

export function checkPurchase(purchase: PurchaseToCheck, rules: SpendingRules, soFar: SpendingSoFar): RuleCheck {
  const formatMoney = moneyFormatter(rules.currency);

  const hardRuleProblem =
    findAmountProblem(purchase.amount, purchase.currency, rules) ??
    (isListed(rules.blockedMerchants, purchase.merchant)
      ? blocked("blocked_merchant", `You blocked the merchant "${purchase.merchant}".`)
      : null) ??
    (rules.allowedMerchants.length > 0 && !isListed(rules.allowedMerchants, purchase.merchant)
      ? blocked("merchant_not_allowed", `"${purchase.merchant}" is not on your list of allowed merchants.`)
      : null) ??
    (isListed(rules.blockedCategories, purchase.category)
      ? blocked("blocked_category", `You blocked the category "${purchase.category}".`)
      : null) ??
    (rules.allowedCategories.length > 0 && !isListed(rules.allowedCategories, purchase.category)
      ? blocked("category_not_allowed", `"${purchase.category}" is not one of your allowed categories.`)
      : null) ??
    (purchase.amount > rules.maxItemPrice
      ? blocked(
          "max_item_price",
          `${formatMoney(purchase.amount)} is over your ${formatMoney(rules.maxItemPrice)} per-item maximum.`,
        )
      : null) ??
    findSpendingCapProblem(purchase.amount, rules, soFar);

  if (hardRuleProblem) return hardRuleProblem;

  const reasonsToAsk = [
    purchase.amount > rules.autoApproveLimit && {
      rule: "auto_approve_limit" as const,
      text: `${formatMoney(purchase.amount)} is over your ${formatMoney(rules.autoApproveLimit)} auto-approve limit.`,
    },
    soFar.spentOnRequest + purchase.amount > soFar.requestBudget && {
      rule: "request_budget" as const,
      text: `It would bring this request to ${formatMoney(soFar.spentOnRequest + purchase.amount)}, over its ${formatMoney(soFar.requestBudget)} budget.`,
    },
  ];
  return askOrAllow(
    reasonsToAsk,
    `${formatMoney(purchase.amount)} is within every rule, so it can be bought without asking.`,
  );
}

export function checkPayment(payment: PaymentToCheck, rules: SpendingRules, soFar: SpendingSoFar): RuleCheck {
  const formatMoney = moneyFormatter(rules.currency);

  const hardRuleProblem =
    findAmountProblem(payment.amount, payment.currency, rules) ??
    (payment.amount > rules.maxPaymentPerPerson
      ? blocked(
          "max_payment_per_person",
          `${formatMoney(payment.amount)} is over your ${formatMoney(rules.maxPaymentPerPerson)} limit for paying one person.`,
        )
      : null) ??
    findSpendingCapProblem(payment.amount, rules, soFar);

  if (hardRuleProblem) return hardRuleProblem;

  const reasonsToAsk = [
    rules.newPeopleNeedApproval &&
      !payment.personIsTrusted && {
        rule: "new_person" as const,
        text: `${payment.personName} isn't on your trusted list yet.`,
      },
    payment.amount > rules.autoApproveLimit && {
      rule: "auto_approve_limit" as const,
      text: `${formatMoney(payment.amount)} is over your ${formatMoney(rules.autoApproveLimit)} auto-approve limit.`,
    },
    soFar.spentOnRequest + payment.amount > soFar.requestBudget && {
      rule: "request_budget" as const,
      text: `It would bring this request to ${formatMoney(soFar.spentOnRequest + payment.amount)}, over its ${formatMoney(soFar.requestBudget)} budget.`,
    },
  ];
  return askOrAllow(
    reasonsToAsk,
    `${formatMoney(payment.amount)} to ${payment.personName} is within every rule, so it can be sent without asking.`,
  );
}

/** Adds up money already paid or reserved, for budgets and caps. */
export function calculateSpendingSoFar(
  decisions: { requestId: string; amount: number; outcome: Outcome; createdAt: string }[],
  requestId: string,
  requestBudget: number,
  now: Date = new Date(),
): SpendingSoFar {
  const committed = decisions.filter((d) => COMMITTED_OUTCOMES.includes(d.outcome));
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const total = (list: typeof committed) => list.reduce((sum, d) => sum + d.amount, 0);

  return {
    requestBudget,
    spentOnRequest: total(committed.filter((d) => d.requestId === requestId)),
    spentToday: total(committed.filter((d) => new Date(d.createdAt) >= startOfToday)),
    spentThisWeek: total(committed.filter((d) => new Date(d.createdAt) >= oneWeekAgo)),
  };
}

// ---- helpers ----

function findAmountProblem(amount: number, currency: string, rules: SpendingRules): RuleCheck | null {
  if (!Number.isFinite(amount) || amount <= 0) return blocked("invalid_amount", "There is no valid amount to pay.");
  if (currency.toUpperCase() !== rules.currency.toUpperCase()) {
    return blocked("currency_mismatch", `Priced in ${currency}, but your wallet only spends ${rules.currency}.`);
  }
  return null;
}

function findSpendingCapProblem(amount: number, rules: SpendingRules, soFar: SpendingSoFar): RuleCheck | null {
  const formatMoney = moneyFormatter(rules.currency);
  if (soFar.spentThisWeek + amount > rules.weeklyCap) {
    return blocked(
      "weekly_cap",
      `It would bring this week's spending to ${formatMoney(soFar.spentThisWeek + amount)}, over your ${formatMoney(rules.weeklyCap)} weekly cap.`,
    );
  }
  if (soFar.spentToday + amount > rules.dailyCap) {
    return blocked(
      "daily_cap",
      `It would bring today's spending to ${formatMoney(soFar.spentToday + amount)}, over your ${formatMoney(rules.dailyCap)} daily cap.`,
    );
  }
  return null;
}

function askOrAllow(reasons: (false | { rule: RuleName; text: string })[], allowedText: string): RuleCheck {
  const reasonsToAsk = reasons.filter((r): r is { rule: RuleName; text: string } => Boolean(r));
  if (reasonsToAsk.length === 0) return { verdict: "allowed", ruleHit: "within_rules", explanation: allowedText };
  return {
    verdict: "needs_approval",
    ruleHit: reasonsToAsk[0].rule,
    explanation: `${reasonsToAsk.map((r) => r.text).join(" ")} Holding it for your approval.`,
  };
}

function blocked(ruleHit: RuleName, explanation: string): RuleCheck {
  return { verdict: "blocked", ruleHit, explanation };
}

function isListed(list: string[], value: string) {
  return list.some((item) => item.trim().toLowerCase() === value.trim().toLowerCase());
}

function moneyFormatter(currency: string) {
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency });
  return (amount: number) => formatter.format(amount);
}
