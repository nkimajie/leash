import { describe, expect, it } from "vitest";
import { SAMPLE_HISTORY_REQUEST_ID, type Decision } from "@/schemas";
import { toDashboardRow } from "./dashboard-data";

function decision(details: Partial<Decision>): Decision {
  return {
    id: "d",
    requestId: "r1",
    kind: "purchase",
    title: "Item",
    counterparty: "Store",
    category: null,
    amount: 10,
    currency: "USD",
    outcome: "auto_approved",
    ruleHit: "within_rules",
    ruleExplanation: "",
    aiReasoning: "",
    product: null,
    payee: null,
    paypal: { orderId: null, authorizationId: null, captureId: null, status: null, debugId: null, payoutId: null },
    shipping: null,
    createdAt: "2026-11-10T09:00:00",
    updatedAt: "2026-11-10T09:00:00",
    ...details,
  };
}

const moneyOf = (details: Partial<Decision>) => {
  const { paid, reserved, stopped, refunded } = toDashboardRow(decision({ amount: 20, ...details }));
  return { paid, reserved, stopped, refunded };
};

describe("toDashboardRow", () => {
  it("puts the amount in the one column that says what happened to the money", () => {
    expect(moneyOf({ outcome: "auto_approved" })).toEqual({ paid: 20, reserved: 0, stopped: 0, refunded: 0 });
    expect(moneyOf({ outcome: "approved" })).toEqual({ paid: 20, reserved: 0, stopped: 0, refunded: 0 });
    expect(moneyOf({ outcome: "held" })).toEqual({ paid: 0, reserved: 20, stopped: 0, refunded: 0 });
    expect(moneyOf({ outcome: "blocked" })).toEqual({ paid: 0, reserved: 0, stopped: 20, refunded: 0 });
    expect(moneyOf({ outcome: "denied" })).toEqual({ paid: 0, reserved: 0, stopped: 20, refunded: 0 });
    expect(moneyOf({ outcome: "refunded" })).toEqual({ paid: 0, reserved: 0, stopped: 0, refunded: 20 });
    expect(moneyOf({ outcome: "failed" })).toEqual({ paid: 0, reserved: 0, stopped: 0, refunded: 0 });
  });

  it("uses the words on screen: stamps, rules and categories", () => {
    const row = toDashboardRow(decision({ outcome: "blocked", ruleHit: "blocked_category", category: "gift cards" }));
    expect(row).toMatchObject({
      stamp: "Blocked",
      rule: "Blocked category",
      category: "Gift cards",
      day: "2026-11-10",
    });
    expect(toDashboardRow(decision({ outcome: "denied" })).stamp).toBe("Released");
    expect(toDashboardRow(decision({ kind: "payment" })).category).toBe("People");
  });

  it("tells the sample history apart from yours", () => {
    expect(toDashboardRow(decision({ requestId: SAMPLE_HISTORY_REQUEST_ID })).history).toBe("Sample");
    expect(toDashboardRow(decision({})).history).toBe("Yours");
  });
});
