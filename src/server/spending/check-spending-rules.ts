// The rule engine. Pure functions with no database or network calls, so they are easy
// to test and easy to read.
//
// Rules come in two strengths:
//   hard rules -> "blocked"         PayPal is never called
//   soft rules -> "needs_approval"  PayPal reserves the money and you decide
// Anything that passes both is "allowed": PayPal reserves and takes the money.

import type { Outcome, RuleCheck, RuleName, SpendingRules } from "@/schemas";
import { COMMITTED_OUTCOMES, isSampleHistory } from "@/schemas";

/** Money already committed (paid or reserved) when a new purchase or payment is checked. */
export type SpendingSoFar = {
  requestBudget: number;
  spentOnRequest: number;
  spentToday: number;
  spentThisWeek: number;
};

export type PurchaseToCheck = {
  title: string;
  amount: number;
  currency: string;
  merchant: string;
  category: string;
  /**
   * Your own words for this request, e.g. "Restock my coffee, under $60". Null for an outside agent's
   * request (the Leash API): its text is the agent's, so there are no words of yours to compare with.
   */
  whatYouAskedFor: string | null;
};
export type PaymentToCheck = {
  personName: string;
  amount: number;
  currency: string;
  personIsTrusted: boolean;
  /** Without a PayPal email there's nowhere to send the money, so you're asked first. */
  personHasEmail: boolean;
};

export function checkPurchase(purchase: PurchaseToCheck, rules: SpendingRules, soFar: SpendingSoFar): RuleCheck {
  const formatMoney = moneyFormatter(rules.currency);

  const amountProblem = findAmountProblem(purchase.amount, purchase.currency, rules);
  if (amountProblem) return amountProblem;

  // Every hard rule it breaks, so raising one limit doesn't just reveal the next.
  const hardRuleProblems = [
    isListed(rules.blockedMerchants, purchase.merchant) &&
      blocked("blocked_merchant", `You blocked the merchant "${purchase.merchant}".`),
    rules.allowedMerchants.length > 0 &&
      !isListed(rules.allowedMerchants, purchase.merchant) &&
      blocked("merchant_not_allowed", `"${purchase.merchant}" is not on your list of allowed merchants.`),
    isListed(rules.blockedCategories, purchase.category) &&
      blocked("blocked_category", `You blocked the category "${purchase.category}".`),
    rules.allowedCategories.length > 0 &&
      !isListed(rules.allowedCategories, purchase.category) &&
      blocked("category_not_allowed", `"${purchase.category}" is not one of your allowed categories.`),
    purchase.amount > rules.maxItemPrice &&
      blocked(
        "max_item_price",
        `${formatMoney(purchase.amount)} is over your ${formatMoney(rules.maxItemPrice)} hard limit for one item.`,
      ),
    ...findSpendingCapProblems(purchase.amount, rules, soFar),
  ];
  const blockedBy = allProblems(hardRuleProblems);
  if (blockedBy) return blockedBy;

  const reasonsToAsk = [
    purchase.whatYouAskedFor !== null &&
      !isWhatYouAskedFor({ ...purchase, whatYouAskedFor: purchase.whatYouAskedFor }) && {
        rule: "off_request" as const,
        text: `Your request ("${purchase.whatYouAskedFor}") doesn't mention anything like this, so I'm asking first.`,
      },
    purchase.amount > rules.autoApproveLimit && {
      rule: "auto_approve_limit" as const,
      text: `${formatMoney(purchase.amount)} is over your ${formatMoney(rules.autoApproveLimit)} pay-without-asking limit.`,
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

  const amountProblem = findAmountProblem(payment.amount, payment.currency, rules);
  if (amountProblem) return amountProblem;

  const blockedBy = allProblems([
    payment.amount > rules.maxPaymentPerPerson &&
      blocked(
        "max_payment_per_person",
        `${formatMoney(payment.amount)} is over your ${formatMoney(rules.maxPaymentPerPerson)} hard limit for paying one person.`,
      ),
    ...findSpendingCapProblems(payment.amount, rules, soFar),
  ]);
  if (blockedBy) return blockedBy;

  const reasonsToAsk = [
    rules.newPeopleNeedApproval &&
      !payment.personIsTrusted && {
        rule: "new_person" as const,
        text: `${payment.personName} isn't on your trusted list yet.`,
      },
    !payment.personHasEmail && {
      rule: "no_paypal_email" as const,
      text: `There's no PayPal email for ${payment.personName} yet; add it in Your leash, under People.`,
    },
    payment.amount > rules.autoApproveLimit && {
      rule: "auto_approve_limit" as const,
      text: `${formatMoney(payment.amount)} is over your ${formatMoney(rules.autoApproveLimit)} pay-without-asking limit.`,
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

/** Adds up money already paid or reserved, for budgets and caps. Sample history never counts. */
export function calculateSpendingSoFar(
  decisions: { requestId: string; amount: number; outcome: Outcome; createdAt: string }[],
  requestId: string,
  requestBudget: number,
  now: Date = new Date(),
): SpendingSoFar {
  const committed = decisions.filter((d) => COMMITTED_OUTCOMES.includes(d.outcome) && !isSampleHistory(d));
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

/**
 * Stay on what you asked for: the product must share a word with your request, or a closely
 * related one ("coffee" also covers espresso, grinders and filters). A hijacked assistant can then
 * no longer slip unrelated things into your order, however cheap each one is: they wait for you.
 * A request with no specific words ("surprise me") can't be checked, so it passes.
 */
export function isWhatYouAskedFor(purchase: { title: string; category: string; whatYouAskedFor: string }): boolean {
  const askedFor = meaningfulWords(purchase.whatYouAskedFor).flatMap((word) => [word, ...(RELATED_WORDS[word] ?? [])]);
  if (askedFor.length === 0) return true;
  const productWords = meaningfulWords(`${purchase.title} ${purchase.category}`);
  return askedFor.some((asked) =>
    // Longer words may sit inside a product word: "coffee" in "coffeemaker", but not "card" in "cardigan".
    productWords.some((word) => word === asked || (asked.length >= 5 && word.includes(asked))),
  );
}

/** Words that say what you want, without filler: "Restock my dog's food!" -> ["dog", "food"]. */
function meaningfulWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // "café" -> "cafe"
    .split(/[^a-z]+/)
    .map((word) => (word.length > 3 ? word.replace(/ies$/, "y").replace(/s$/, "") : word)) // "beans" -> "bean"
    .filter((word) => word.length > 2 && !FILLER_WORDS.has(word));
}

const FILLER_WORDS = new Set(
  (
    "the and for our you your with some any more few new get buy order restock need want please can could " +
    "find help just only under over below max budget usual same again every week month day setup set stuff " +
    "thing supply something anything surprise cheap good best nice what that this from into ask"
  ).split(" "),
);

/** Everyday requests use a general word ("coffee") for specific products ("burr mill"). */
const RELATED_WORDS: Record<string, string[]> = {
  coffee: ["espresso", "bean", "roast", "brew", "blend", "grinder", "mill", "burr", "filter", "dripper", "kettle"],
  grinder: ["mill", "burr"],
  dog: ["puppy", "pet", "kibble", "chew", "treat", "leash", "collar"],
  cat: ["kitten", "pet", "litter"],
  office: ["paper", "pen", "notebook", "stapler", "desk"],
};

// ---- helpers ----

function findAmountProblem(amount: number, currency: string, rules: SpendingRules): RuleCheck | null {
  if (!Number.isFinite(amount) || amount <= 0) return blocked("invalid_amount", "There is no valid amount to pay.");
  if (currency.toUpperCase() !== rules.currency.toUpperCase()) {
    return blocked("currency_mismatch", `Priced in ${currency}, but your wallet only spends ${rules.currency}.`);
  }
  return null;
}

/** Money reserved for your okay counts toward the caps too, so denying something waiting frees it. */
function findSpendingCapProblems(amount: number, rules: SpendingRules, soFar: SpendingSoFar): (RuleCheck | false)[] {
  const formatMoney = moneyFormatter(rules.currency);
  return [
    soFar.spentThisWeek + amount > rules.weeklyCap &&
      blocked(
        "weekly_cap",
        `It would bring this week's spending to ${formatMoney(soFar.spentThisWeek + amount)}, over your ${formatMoney(rules.weeklyCap)} weekly cap.`,
      ),
    soFar.spentToday + amount > rules.dailyCap &&
      blocked(
        "daily_cap",
        `It would bring today's spending to ${formatMoney(soFar.spentToday + amount)}, over your ${formatMoney(rules.dailyCap)} daily cap.`,
      ),
  ];
}

/** All the hard rules something breaks, as one: the first names the rule, the explanation lists them all. */
function allProblems(problems: (RuleCheck | false)[]): RuleCheck | null {
  const found = problems.filter((problem): problem is RuleCheck => Boolean(problem));
  if (found.length === 0) return null;
  return { ...found[0], explanation: found.map((problem) => problem.explanation).join(" ") };
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

/**
 * Scheduled restocks run while you're away, so even a purchase within every rule
 * waits for your OK. Blocked stays blocked, and anything already held stays held.
 */
export function holdForScheduledRestock(check: RuleCheck): RuleCheck {
  if (check.verdict !== "allowed") return check;
  return {
    verdict: "needs_approval",
    ruleHit: "scheduled_restock",
    explanation: "Scheduled restocks always wait for your OK, because you weren't there when it ran.",
  };
}
