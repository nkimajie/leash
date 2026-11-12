import { describe, expect, it } from "vitest";
import { describeBalance, describeWaiting, describeWhatICanDo, type LeashStatus } from "./what-leash-can-do";

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
  paidOrReserved: { today: 99, thisWeek: 99 },
  leftToSpend: { today: 301, thisWeek: 901 },
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

describe("describeBalance", () => {
  it("gives your leash balance, what's reserved, and where to see your PayPal balance", () => {
    const answer = describeBalance(status);
    expect(answer).toContain("You have $301.00 left to spend today, of your $400.00 daily cap, and $901.00 this week");
    expect(answer).toContain("$85.00 more is reserved for your okay: deny it and it's back in your budget.");
    expect(answer).toContain("check it in the PayPal app");
  });

  it("leaves out the reserved line when nothing is waiting", () => {
    expect(describeBalance({ ...status, waitingForYou: [] })).not.toContain("reserved");
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
