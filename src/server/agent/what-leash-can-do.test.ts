import { describe, expect, it } from "vitest";
import { describeWaiting, describeWhatICanDo, type LeashStatus } from "./what-leash-can-do";

const status: LeashStatus = {
  paypal: { mode: "paypal-sandbox", connected: true, payerEmail: "you@example.com" },
  rules: {
    currency: "USD",
    autoApproveLimit: 50,
    maxItemPrice: 200,
    maxPaymentPerPerson: 150,
    dailyCap: 400,
    weeklyCap: 1000,
    blockedCategories: ["gift cards"],
    newPeopleNeedApproval: true,
  },
  paidOrReserved: { today: 14, thisWeek: 14 },
  waitingForYou: [{ id: "d1", title: "Baratza Encore Grinder", amount: 85, why: "Over your $50 limit." }],
  people: [{ name: "Sam", trusted: true, hasPayPalEmail: true }],
  twinRemembers: [],
  restocks: [],
};

describe("describeWhatICanDo", () => {
  it("lists what Leash can do, how PayPal keeps you safe, and where you stand", () => {
    const answer = describeWhatICanDo(status, false);
    expect(answer).toContain("• Shop for you");
    expect(answer).toContain("I can never approve anything");
    expect(answer).toContain("PayPal only reserves");
    expect(answer).toContain(
      "Right now, I can spend up to $50.00 at a time without asking you, and 1 thing is waiting",
    );
  });

  it("keeps the spoken answer short, with no list", () => {
    const answer = describeWhatICanDo(status, true);
    expect(answer).not.toContain("•");
    expect(answer.length).toBeLessThan(400);
  });

  it("says when PayPal isn't connected", () => {
    const answer = describeWhatICanDo({ ...status, paypal: { ...status.paypal, connected: false } }, true);
    expect(answer).toContain("PayPal isn't connected yet");
  });
});

describe("describeWaiting", () => {
  it("lists each item with its price and why it waits", () => {
    expect(describeWaiting(status)).toContain("Baratza Encore Grinder ($85.00): Over your $50 limit.");
  });

  it("says when nothing is waiting", () => {
    expect(describeWaiting({ ...status, waitingForYou: [] })).toMatch(/^Nothing is waiting/);
  });
});
