import { describe, expect, it } from "vitest";
import { DEFAULT_SPENDING_RULES } from "@/schemas";
import { applyRuleChanges, describeRuleChanges, readRulesSentence } from "./read-rules-sentence";

describe("rules in one sentence, without Claude", () => {
  it("reads limits and blocked categories", () => {
    const changes = readRulesSentence("Ask me before anything over $30, no alcohol or snacks, max $100 a day");
    expect(changes).toMatchObject({ autoApproveLimit: 30, dailyCap: 100, blockCategories: ["alcohol", "snacks"] });
  });

  it("reads per-person and per-item limits", () => {
    expect(readRulesSentence("Never send anyone more than $40")).toMatchObject({ maxPaymentPerPerson: 40 });
    expect(readRulesSentence("Never buy anything over $120")).toMatchObject({ maxItemPrice: 120 });
  });
});

describe("applying and describing rule changes", () => {
  it("changes only what was mentioned, and lists each change in words", () => {
    const after = applyRuleChanges(DEFAULT_SPENDING_RULES, {
      ...readRulesSentence(""),
      autoApproveLimit: 30,
      blockCategories: ["Snacks", "alcohol"],
    });
    expect(after.autoApproveLimit).toBe(30);
    expect(after.dailyCap).toBe(DEFAULT_SPENDING_RULES.dailyCap);
    expect(after.blockedCategories.filter((c) => c === "alcohol")).toHaveLength(1);
    expect(describeRuleChanges(DEFAULT_SPENDING_RULES, after)).toEqual([
      "Pay without asking up to: $50 → $30",
      "Block categories: snacks",
    ]);
  });
});
