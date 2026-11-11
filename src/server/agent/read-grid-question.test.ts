import { describe, expect, it } from "vitest";
import { readGridQuestion } from "./read-grid-question";

describe("reading a money question without Claude", () => {
  it("understands outcomes, people, amounts and order", () => {
    expect(readGridQuestion("held payments over $20, biggest first")).toMatchObject({
      outcomes: ["held"],
      kind: "payment",
      minAmount: 20,
      sortBy: "amount",
      sortDirection: "desc",
    });
  });

  it("understands 'what did I spend on coffee this week'", () => {
    expect(readGridQuestion("what did I spend on coffee this week?")).toMatchObject({
      outcomes: ["auto_approved", "approved"],
      searchText: "coffee",
      sinceDays: 7,
    });
  });

  it("searches for a name on its own", () => {
    expect(readGridQuestion("Sam")).toMatchObject({ searchText: "Sam", outcomes: null });
  });

  it("shows everything when the question names nothing", () => {
    expect(readGridQuestion("show me everything there is to see")).toMatchObject({
      outcomes: null,
      kind: null,
      searchText: null,
      summary: "All items",
    });
  });
});
