// Pure helpers for "rules in one sentence".
// readRulesSentence is the built-in reader used when Claude is off; applyRuleChanges and
// describeRuleChanges turn either reader's answer into new rules and a list you can check.

import type { RuleChanges, SpendingRules } from "@/schemas";

export const NO_CHANGES: RuleChanges = {
  autoApproveLimit: null,
  defaultRequestBudget: null,
  maxItemPrice: null,
  maxPaymentPerPerson: null,
  dailyCap: null,
  weeklyCap: null,
  blockCategories: [],
  unblockCategories: [],
  blockMerchants: [],
  newPeopleNeedApproval: null,
};

const MONEY = String.raw`\$\s?(\d+(?:\.\d{1,2})?)`;

/** Understands the most common ways of saying a rule. Claude handles everything else. */
export function readRulesSentence(sentence: string): RuleChanges {
  const text = sentence.toLowerCase();
  const amount = (pattern: string) => {
    const match = text.match(new RegExp(pattern + String.raw`[^$]*` + MONEY));
    return match ? Number(match[1]) : null;
  };
  const blocked = text.match(
    /\b(?:no|block|never buy|don't buy|stop buying)\s+([a-z ,&-]+?)(?:[.;]|$|\s+(?:and )?(?:ask|never|keep|max|limit))/,
  );

  return {
    ...NO_CHANGES,
    autoApproveLimit: amount(String.raw`\b(?:ask|check with) me (?:before|for)`),
    maxItemPrice: amount(String.raw`\bnever (?:buy|spend) (?:anything|one item|an item)? ?(?:over|above|more than)`),
    maxPaymentPerPerson: amount(String.raw`\bnever (?:send|pay) (?:anyone|a person|one person|people)`),
    dailyCap: amountNear(text, String.raw`(?:a day|per day|daily)`),
    weeklyCap: amountNear(text, String.raw`(?:a week|per week|weekly)`),
    blockCategories: blocked
      ? blocked[1]
          .split(/,|\band\b|\bor\b|&/)
          .map((word) => word.trim())
          .filter((word) => word.length > 1)
      : [],
  };
}

/** "$100 a day" or "daily cap of $100": an amount just before or after a word. */
function amountNear(text: string, word: string): number | null {
  const match =
    text.match(new RegExp(MONEY + String.raw`\s*(?:in total\s*)?` + word)) ??
    text.match(new RegExp(word + String.raw`[^$.]{0,25}` + MONEY));
  return match ? Number(match[1]) : null;
}

/** The rules after the changes, unchanged where the sentence said nothing. */
export function applyRuleChanges(rules: SpendingRules, changes: RuleChanges): SpendingRules {
  const pick = (value: number | null, current: number) => (value !== null && value > 0 ? value : current);
  const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const withAdded = (list: string[], added: string[]) => [
    ...list,
    ...added.map((item) => item.trim().toLowerCase()).filter((item) => item && !list.some((x) => sameName(x, item))),
  ];

  return {
    ...rules,
    autoApproveLimit: pick(changes.autoApproveLimit, rules.autoApproveLimit),
    defaultRequestBudget: pick(changes.defaultRequestBudget, rules.defaultRequestBudget),
    maxItemPrice: pick(changes.maxItemPrice, rules.maxItemPrice),
    maxPaymentPerPerson: pick(changes.maxPaymentPerPerson, rules.maxPaymentPerPerson),
    dailyCap: pick(changes.dailyCap, rules.dailyCap),
    weeklyCap: pick(changes.weeklyCap, rules.weeklyCap),
    blockedCategories: withAdded(rules.blockedCategories, changes.blockCategories).filter(
      (category) => !changes.unblockCategories.some((removed) => sameName(removed, category)),
    ),
    blockedMerchants: withAdded(rules.blockedMerchants, changes.blockMerchants),
    newPeopleNeedApproval: changes.newPeopleNeedApproval ?? rules.newPeopleNeedApproval,
  };
}

const MONEY_LABELS: [keyof SpendingRules, string][] = [
  ["autoApproveLimit", "Pay without asking up to"],
  ["defaultRequestBudget", "Budget per request"],
  ["maxItemPrice", "Never buy one item over"],
  ["maxPaymentPerPerson", "Never send one person over"],
  ["dailyCap", "Daily cap"],
  ["weeklyCap", "Weekly cap"],
];

/** Each difference in plain words, e.g. "Daily cap: $250 → $100". */
export function describeRuleChanges(before: SpendingRules, after: SpendingRules): string[] {
  const money = (value: unknown) => `$${Number(value).toFixed(0)}`;
  const changes = MONEY_LABELS.filter(([key]) => before[key] !== after[key]).map(
    ([key, label]) => `${label}: ${money(before[key])} → ${money(after[key])}`,
  );
  const added = (key: "blockedCategories" | "blockedMerchants") => after[key].filter((x) => !before[key].includes(x));
  const removed = (key: "blockedCategories" | "blockedMerchants") => before[key].filter((x) => !after[key].includes(x));

  if (added("blockedCategories").length) changes.push(`Block categories: ${added("blockedCategories").join(", ")}`);
  if (removed("blockedCategories").length) {
    changes.push(`Allow categories again: ${removed("blockedCategories").join(", ")}`);
  }
  if (added("blockedMerchants").length) changes.push(`Block stores: ${added("blockedMerchants").join(", ")}`);
  if (before.newPeopleNeedApproval !== after.newPeopleNeedApproval) {
    changes.push(after.newPeopleNeedApproval ? "Always ask before paying someone new" : "Let it pay new people");
  }
  return changes;
}
