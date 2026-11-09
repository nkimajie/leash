import { describe, expect, it } from "vitest";
import { DEFAULT_SPENDING_RULES, type SpendingRules } from "@/schemas";
import {
  calculateSpendingSoFar,
  checkPayment,
  checkPurchase,
  holdForScheduledRestock,
  isWhatYouAskedFor,
  type PaymentToCheck,
  type PurchaseToCheck,
  type SpendingSoFar,
} from "./check-spending-rules";

const rules: SpendingRules = { ...DEFAULT_SPENDING_RULES, autoApproveLimit: 50, dailyCap: 250, weeklyCap: 500 };
const nothingSpent: SpendingSoFar = { requestBudget: 60, spentOnRequest: 0, spentToday: 0, spentThisWeek: 0 };

const coffee = (changes: Partial<PurchaseToCheck> = {}): PurchaseToCheck => ({
  title: "Fair-trade coffee beans",
  amount: 14,
  currency: "USD",
  merchant: "Bean & Leaf Market",
  category: "coffee",
  whatYouAskedFor: "Restock my coffee, under $60",
  ...changes,
});

describe("checkPurchase", () => {
  it("allows a cheap item that is inside every rule", () => {
    expect(checkPurchase(coffee(), rules, nothingSpent)).toMatchObject({ verdict: "allowed", ruleHit: "within_rules" });
  });

  it("holds an item over the auto-approve limit (demo: the $85 grinder)", () => {
    const result = checkPurchase(coffee({ amount: 85 }), rules, nothingSpent);
    expect(result).toMatchObject({ verdict: "needs_approval", ruleHit: "auto_approve_limit" });
    expect(result.explanation).toContain("$50.00 auto-approve limit");
  });

  it("holds an item that would go over the request budget", () => {
    const result = checkPurchase(coffee({ amount: 20 }), rules, { ...nothingSpent, spentOnRequest: 45 });
    expect(result).toMatchObject({ verdict: "needs_approval", ruleHit: "request_budget" });
  });

  it("treats exactly the auto-approve limit as allowed", () => {
    const roomyBudget = { ...nothingSpent, requestBudget: 100 };
    expect(checkPurchase(coffee({ amount: 50 }), rules, roomyBudget).verdict).toBe("allowed");
  });

  it("blocks anything over the per-item maximum", () => {
    expect(checkPurchase(coffee({ amount: 250 }), rules, nothingSpent).ruleHit).toBe("max_item_price");
  });

  it("blocks blocked categories, ignoring upper and lower case", () => {
    expect(checkPurchase(coffee({ category: "Gift Cards" }), rules, nothingSpent).ruleHit).toBe("blocked_category");
  });

  it("blocks categories and merchants outside an allow-list", () => {
    expect(checkPurchase(coffee(), { ...rules, allowedCategories: ["books"] }, nothingSpent).ruleHit).toBe(
      "category_not_allowed",
    );
    expect(checkPurchase(coffee(), { ...rules, allowedMerchants: ["Other Shop"] }, nothingSpent).ruleHit).toBe(
      "merchant_not_allowed",
    );
    expect(checkPurchase(coffee(), { ...rules, blockedMerchants: ["bean & leaf market"] }, nothingSpent).ruleHit).toBe(
      "blocked_merchant",
    );
  });

  it("blocks when the daily or weekly cap would be passed", () => {
    expect(checkPurchase(coffee(), rules, { ...nothingSpent, spentToday: 245, spentThisWeek: 245 }).ruleHit).toBe(
      "daily_cap",
    );
    expect(checkPurchase(coffee(), rules, { ...nothingSpent, spentThisWeek: 495 }).ruleHit).toBe("weekly_cap");
  });

  it("blocks invalid amounts and other currencies", () => {
    expect(checkPurchase(coffee({ amount: 0 }), rules, nothingSpent).ruleHit).toBe("invalid_amount");
    expect(checkPurchase(coffee({ currency: "EUR" }), rules, nothingSpent).ruleHit).toBe("currency_mismatch");
  });
});

describe("stay on what you asked for", () => {
  it("holds something unrelated, however cheap (a hijacked assistant adding dog food to a coffee order)", () => {
    const dogFood = coffee({ title: "Grain-free dry dog food, 5 kg", category: "pet supplies", amount: 9 });
    expect(checkPurchase(dogFood, rules, nothingSpent)).toMatchObject({
      verdict: "needs_approval",
      ruleHit: "off_request",
    });
  });

  it("matches on the product's title or category, ignoring filler words and plurals", () => {
    const grinder = { title: "Conical burr grinder", category: "coffee equipment" };
    expect(isWhatYouAskedFor({ ...grinder, whatYouAskedFor: "Restock my coffee setup, under $60" })).toBe(true);
    expect(isWhatYouAskedFor({ ...grinder, whatYouAskedFor: "I need new grinders please" })).toBe(true);
    expect(isWhatYouAskedFor({ ...grinder, whatYouAskedFor: "Get printer paper" })).toBe(false);
  });

  it("can't check a request with nothing specific in it, so lets it pass", () => {
    expect(isWhatYouAskedFor({ title: "Gel pens", category: "office", whatYouAskedFor: "Surprise me!" })).toBe(true);
  });
});

describe("checkPayment", () => {
  const payment = (changes: Partial<PaymentToCheck> = {}): PaymentToCheck => ({
    personName: "Sam",
    amount: 25,
    currency: "USD",
    personIsTrusted: true,
    personHasEmail: true,
    ...changes,
  });

  it("allows a small payment to a trusted person", () => {
    expect(checkPayment(payment(), rules, nothingSpent).verdict).toBe("allowed");
  });

  it("holds a payment to someone new", () => {
    expect(checkPayment(payment({ personIsTrusted: false }), rules, nothingSpent)).toMatchObject({
      verdict: "needs_approval",
      ruleHit: "new_person",
    });
  });

  it("lets new people through when that rule is switched off", () => {
    const relaxed = { ...rules, newPeopleNeedApproval: false };
    expect(checkPayment(payment({ personIsTrusted: false }), relaxed, nothingSpent).verdict).toBe("allowed");
  });

  it("asks first when there's no PayPal email to send the money to", () => {
    expect(checkPayment(payment({ personHasEmail: false }), rules, nothingSpent)).toMatchObject({
      verdict: "needs_approval",
      ruleHit: "no_paypal_email",
    });
  });

  it("blocks a payment over the per-person limit", () => {
    expect(checkPayment(payment({ amount: 500 }), rules, nothingSpent).ruleHit).toBe("max_payment_per_person");
  });
});

describe("calculateSpendingSoFar", () => {
  const now = new Date("2026-11-06T15:00:00");
  const decision = (
    requestId: string,
    amount: number,
    outcome: "auto_approved" | "held" | "denied",
    createdAt: string,
  ) => ({
    requestId,
    amount,
    outcome,
    createdAt,
  });

  it("counts paid and reserved money, but not denied money", () => {
    const soFar = calculateSpendingSoFar(
      [
        decision("r1", 14, "auto_approved", "2026-11-06T10:00:00"),
        decision("r1", 85, "held", "2026-11-06T11:00:00"),
        decision("r1", 30, "denied", "2026-11-06T12:00:00"),
        decision("r2", 20, "auto_approved", "2026-11-03T12:00:00"),
        decision("r3", 99, "auto_approved", "2026-10-01T12:00:00"),
      ],
      "r1",
      60,
      now,
    );
    expect(soFar).toEqual({ requestBudget: 60, spentOnRequest: 99, spentToday: 99, spentThisWeek: 119 });
  });
});

describe("holdForScheduledRestock", () => {
  it("holds a purchase that would otherwise be paid automatically", () => {
    const check = holdForScheduledRestock({ verdict: "allowed", ruleHit: "within_rules", explanation: "" });
    expect(check).toMatchObject({ verdict: "needs_approval", ruleHit: "scheduled_restock" });
  });

  it("keeps a blocked purchase blocked", () => {
    const blocked = { verdict: "blocked", ruleHit: "blocked_category", explanation: "" } as const;
    expect(holdForScheduledRestock(blocked)).toEqual(blocked);
  });
});
