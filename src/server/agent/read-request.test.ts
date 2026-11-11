import { describe, expect, it } from "vitest";
import { readBudget, readPaymentInstruction, readRestockSchedule } from "./read-request";

describe("readBudget", () => {
  it.each([
    ["Restock my coffee setup, under $60, fair-trade beans only", 60],
    ["office stuff, max $25.50", 25.5],
    ["dog food with a budget of $120", 120],
    ["up to $ 40 on snacks", 40],
    ["restock my coffee under 60 dollars", 60],
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

  it("reads money the way speech recognition writes it", () => {
    expect(readPaymentInstruction("pay Sam 25 dollars for dinner")).toEqual({
      personName: "Sam",
      amount: 25,
      note: "dinner",
    });
    expect(readPaymentInstruction("send 30 bucks to Jordan")?.amount).toBe(30);
  });

  it("ignores shopping requests", () => {
    expect(readPaymentInstruction("Restock my coffee setup, under $60")).toBeNull();
  });
});

describe("readRestockSchedule", () => {
  it.each([
    ["Restock dog food every 30 days", "Restock dog food", 30],
    ["restock dog food every 30 days, under $40", "Restock dog food, under $40", 30],
    ["Order printer paper every week", "Order printer paper", 7],
    ["buy coffee beans every other week", "Buy coffee beans", 14],
    ["Every two months, restock the dog's vitamins", "Restock the dog's vitamins", 60],
    ["please restock my coffee monthly", "Restock my coffee", 30],
    ["Restock cat litter once every fortnight.", "Restock cat litter", 14],
  ])("reads %s", (prompt, what, everyDays) => {
    expect(readRestockSchedule(prompt)).toEqual({ prompt: what, everyDays });
  });

  it("ignores requests without a schedule, or with one Leash can't keep", () => {
    expect(readRestockSchedule("Restock my coffee setup, under $60")).toBeNull();
    expect(readRestockSchedule("Pay Sam $25 for dinner")).toBeNull();
    expect(readRestockSchedule("Restock dog food every 400 days")).toBeNull();
    expect(readRestockSchedule("every week")).toBeNull();
  });
});

describe("readRestockSchedule doesn't see a schedule that isn't there", () => {
  it.each(["Pay Sam $20 for the weekly groceries", "Buy a daily planner", "Restock dog food every 0 days"])(
    "'%s' is not a schedule",
    (prompt) => {
      expect(readRestockSchedule(prompt)).toBeNull();
    },
  );

  it("still reads a schedule word at the end", () => {
    expect(readRestockSchedule("Restock dog food weekly")).toEqual({ prompt: "Restock dog food", everyDays: 7 });
  });
});
