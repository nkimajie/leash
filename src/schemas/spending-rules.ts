import { z } from "zod";

const moneyAmount = z.number().positive().max(100_000);
const nameList = z.array(z.string().trim().min(1));

/** The leash: everything the assistant must respect before money moves. */
export const SpendingRulesSchema = z.object({
  currency: z.string().length(3),
  /** At or below this, the assistant may pay without asking. */
  autoApproveLimit: moneyAmount,
  /** Budget for one request, unless the request names its own ("under $60"). */
  defaultRequestBudget: moneyAmount,
  /** Hard limit: any single product above this is blocked. */
  maxItemPrice: moneyAmount,
  /** Hard limit: any single payment to a person above this is blocked. */
  maxPaymentPerPerson: moneyAmount,
  dailyCap: moneyAmount,
  weeklyCap: moneyAmount,
  /** Empty list means every category is allowed. */
  allowedCategories: nameList,
  blockedCategories: nameList,
  /** Empty list means every merchant is allowed. */
  allowedMerchants: nameList,
  blockedMerchants: nameList,
  /** Paying someone who isn't marked as trusted always waits for you. */
  newPeopleNeedApproval: z.boolean(),
});

export type SpendingRules = z.infer<typeof SpendingRulesSchema>;

export const DEFAULT_SPENDING_RULES: SpendingRules = {
  currency: "USD",
  autoApproveLimit: 50,
  defaultRequestBudget: 100,
  maxItemPrice: 200,
  maxPaymentPerPerson: 150,
  dailyCap: 250,
  weeklyCap: 500,
  allowedCategories: [],
  blockedCategories: ["alcohol", "tobacco", "gift cards", "weapons"],
  allowedMerchants: [],
  blockedMerchants: [],
  newPeopleNeedApproval: true,
};

/** Every rule the engine can report, so the UI can label each one. */
export const RULE_NAMES = [
  "within_rules",
  "auto_approve_limit",
  "request_budget",
  "new_person",
  "max_item_price",
  "max_payment_per_person",
  "daily_cap",
  "weekly_cap",
  "blocked_category",
  "category_not_allowed",
  "blocked_merchant",
  "merchant_not_allowed",
  "currency_mismatch",
  "invalid_amount",
  "payment_declined",
  "payment_error",
] as const;

export type RuleName = (typeof RULE_NAMES)[number];

/** What the rules say about one purchase or payment. */
export type RuleCheck = {
  verdict: "allowed" | "needs_approval" | "blocked";
  ruleHit: RuleName;
  explanation: string;
};
