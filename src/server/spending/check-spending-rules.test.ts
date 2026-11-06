import { describe, expect, it } from "vitest";
import { DEFAULT_SPENDING_RULES, type SpendingRules } from "@/schemas";
import { calculateSpendingSoFar, checkPayment, checkPurchase, type SpendingSoFar } from "./check-spending-rules";

const rules: SpendingRules = { ...DEFAULT_SPENDING_RULES, autoApproveLimit: 50 };
const nothingSpent: SpendingSoFar = { requestBudget: 60, spentOnRequest: 0, spentToday: 0, spentThisWeek: 0 };

const coffee = (changes: Partial<Parameters<typeof checkPurchase>[0]> = {}) => ({
  title: "Fair-trade coffee beans",
  amount: 14,
  currency: "USD",
  merchant: "Bean & Leaf Market",
  category: "coffee",
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

describe("checkPayment", () => {
  const payment = (changes: Partial<Parameters<typeof checkPayment>[0]> = {}) => ({
    personName: "Sam",
    amount: 25,
    currency: "USD",
    personIsTrusted: true,
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
