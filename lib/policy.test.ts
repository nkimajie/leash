import { describe, expect, it } from "vitest";
import { checkPolicy, DEFAULT_RULES, spendContext } from "./policy";
import type { Rules, SpendContext } from "./types";

const rules: Rules = { ...DEFAULT_RULES, goalBudget: 60, autoApproveLimit: 50 };
const fresh: SpendContext = { goalBudget: 60, goalSpent: 0, spentToday: 0, spentThisWeek: 0 };
const item = (over: Partial<Parameters<typeof checkPolicy>[0]> = {}) => ({
  title: "Fair-trade coffee beans",
  price: 14,
  currency: "USD",
  merchant: "Bean Co.",
  category: "coffee",
  ...over,
});

describe("checkPolicy", () => {
  it("auto-approves a cheap item inside every rule", () => {
    const r = checkPolicy(item(), rules, fresh);
    expect(r.verdict).toBe("auto_approve");
    expect(r.rule_hit).toBe("within_rules");
  });

  it("holds an item over the auto-approve limit (demo: $85 grinder)", () => {
    const r = checkPolicy(item({ price: 85 }), rules, fresh);
    expect(r.verdict).toBe("needs_approval");
    expect(r.rule_hit).toBe("auto_approve_limit");
    expect(r.explanation).toContain("$50.00 auto-approve limit");
  });

  it("holds an item that would go over the goal budget", () => {
    const r = checkPolicy(item({ price: 20 }), rules, { ...fresh, goalSpent: 45 });
    expect(r.verdict).toBe("needs_approval");
    expect(r.rule_hit).toBe("goal_budget");
  });

  it("blocks anything over the per-item maximum", () => {
    const r = checkPolicy(item({ price: 250 }), rules, fresh);
    expect(r).toMatchObject({ verdict: "blocked", rule_hit: "max_item_price" });
  });

  it("blocks blocked categories, ignoring case", () => {
    const r = checkPolicy(item({ category: "Gift Cards" }), rules, fresh);
    expect(r).toMatchObject({ verdict: "blocked", rule_hit: "blocked_category" });
  });

  it("blocks categories outside an allow-list", () => {
    const r = checkPolicy(item({ category: "electronics" }), { ...rules, allowedCategories: ["coffee"] }, fresh);
    expect(r).toMatchObject({ verdict: "blocked", rule_hit: "category_not_allowed" });
  });

  it("blocks blocked merchants and merchants outside an allow-list", () => {
    expect(checkPolicy(item(), { ...rules, blockedMerchants: ["bean co."] }, fresh).rule_hit).toBe(
      "blocked_merchant",
    );
    expect(checkPolicy(item(), { ...rules, allowedMerchants: ["Other Shop"] }, fresh).rule_hit).toBe(
      "merchant_not_allowed",
    );
  });

  it("blocks when the daily or weekly cap would be exceeded", () => {
    expect(checkPolicy(item(), rules, { ...fresh, spentToday: 245, spentThisWeek: 245 }).rule_hit).toBe(
      "daily_cap",
    );
    expect(checkPolicy(item(), rules, { ...fresh, spentThisWeek: 495 }).rule_hit).toBe("weekly_cap");
  });

  it("blocks invalid prices and other currencies", () => {
    expect(checkPolicy(item({ price: 0 }), rules, fresh).rule_hit).toBe("invalid_price");
    expect(checkPolicy(item({ currency: "EUR" }), rules, fresh).rule_hit).toBe("currency_mismatch");
  });

  it("treats exactly the auto-approve limit as allowed", () => {
    expect(checkPolicy(item({ price: 50 }), { ...rules, goalBudget: 100 }, { ...fresh, goalBudget: 100 }).verdict).toBe(
      "auto_approve",
    );
  });
});

describe("spendContext", () => {
  const now = new Date("2026-11-05T15:00:00");
  const d = (goal_id: string, price: number, verdict: "auto_captured" | "held" | "voided", created_at: string) => ({
    goal_id,
    price,
    verdict,
    created_at,
  });

  it("counts captured and held money, but not voided money", () => {
    const ctx = spendContext(
      [
        d("g1", 14, "auto_captured", "2026-11-05T10:00:00"),
        d("g1", 85, "held", "2026-11-05T11:00:00"),
        d("g1", 30, "voided", "2026-11-05T12:00:00"),
        d("g2", 20, "auto_captured", "2026-11-02T12:00:00"),
        d("g3", 99, "auto_captured", "2026-10-01T12:00:00"),
      ],
      "g1",
      60,
      now,
    );
    expect(ctx).toEqual({ goalBudget: 60, goalSpent: 99, spentToday: 99, spentThisWeek: 119 });
  });
});
