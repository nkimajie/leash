import { describe, expect, it } from "vitest";
import { SAMPLE_HISTORY_REQUEST_ID, type Decision } from "@/schemas";
import { summariseSpending } from "./summarise-spending";

const now = new Date("2026-11-10T15:00:00");

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

const decisions = [
  decision({ title: "Organic Coffee Beans", category: "coffee", amount: 14 }),
  decision({ title: "Burr Coffee Grinder", category: "coffee", amount: 85, outcome: "held" }),
  decision({ title: "Coffee Filters", category: "coffee", amount: 6, outcome: "denied" }),
  decision({ title: "Old Coffee", category: "coffee", amount: 20, createdAt: "2026-11-01T09:00:00" }),
  decision({ title: "Sample coffee", category: "coffee", amount: 30, requestId: SAMPLE_HISTORY_REQUEST_ID }),
  decision({ kind: "payment", title: "Payment to Sam", counterparty: "Sam", amount: 25, outcome: "approved" }),
];

describe("summariseSpending", () => {
  it("adds up what was paid and what is waiting, for one word and period", () => {
    const summary = summariseSpending(decisions, { searchText: "coffee", sinceDays: 1, kind: null }, now);
    expect(summary.paid).toBe(14);
    expect(summary.waiting).toBe(85);
    expect(summary.answer).toBe(
      "You've spent $14.00 on coffee today (1 item). Another $85.00 is reserved, waiting for your OK.",
    );
  });

  it("never counts the sample history, and looks further back when asked", () => {
    const summary = summariseSpending(decisions, { searchText: "coffee", sinceDays: 30, kind: null }, now);
    expect(summary.paid).toBe(34);
    expect(summary.items.some((item) => item.title === "Sample coffee")).toBe(false);
  });

  it("matches people and kinds", () => {
    const summary = summariseSpending(decisions, { searchText: "sam", sinceDays: 7, kind: "payment" }, now);
    expect(summary.answer).toBe("You've spent $25.00 on sam this week (1 item).");
  });

  it("says when nothing matches", () => {
    const summary = summariseSpending(decisions, { searchText: "tea", sinceDays: 7, kind: null }, now);
    expect(summary.answer).toBe("You haven't spent anything on tea this week.");
  });
});
