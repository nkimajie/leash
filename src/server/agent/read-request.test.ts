import { describe, expect, it } from "vitest";
import { readBudget, readPaymentInstruction } from "./read-request";

describe("readBudget", () => {
  it.each([
    ["Restock my coffee setup, under $60, fair-trade beans only", 60],
    ["office stuff, max $25.50", 25.5],
    ["dog food with a budget of $120", 120],
    ["up to $ 40 on snacks", 40],
  ])("reads %s", (prompt, budget) => {
    expect(readBudget(prompt)).toBe(budget);
  });

  it("returns null when no budget is given", () => {
    expect(readBudget("buy coffee")).toBeNull();
  });
});

describe("readPaymentInstruction", () => {
  it("reads 'pay NAME $X for NOTE'", () => {
    expect(readPaymentInstruction("Pay Sam $25 for dinner")).toEqual({ personName: "Sam", amount: 25, note: "dinner" });
  });

  it("reads 'send $X to NAME'", () => {
    expect(readPaymentInstruction("send $40 to priya shah for babysitting.")).toEqual({
      personName: "Priya Shah",
      amount: 40,
      note: "babysitting",
    });
  });

  it("doesn't mistake 'for' for part of the name", () => {
    expect(readPaymentInstruction("Send $30 to Jordan for concert tickets")).toEqual({
      personName: "Jordan",
      amount: 30,
      note: "concert tickets",
    });
    expect(readPaymentInstruction("pay Sam $12 for lunch")?.personName).toBe("Sam");
  });

  it("ignores shopping requests", () => {
    expect(readPaymentInstruction("Restock my coffee setup, under $60")).toBeNull();
  });
});
