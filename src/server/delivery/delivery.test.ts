import { describe, expect, it } from "vitest";
import type { Shipping } from "@/schemas";
import { describeDelivery, planShipment } from "./delivery";

const shippedAt = new Date("2026-11-11T12:00:00Z");
const shipping: Shipping = {
  ...planShipment("dec-1234-abcd", shippedAt),
  shipTo: "Sam Lee, 1 Main St, Lisbon, PT",
  onPayPalOrder: true,
};

describe("planShipment", () => {
  it("ships with UPS, with a tracking number made from the purchase's id, arriving in 3 days", () => {
    expect(shipping.carrier).toBe("UPS");
    expect(shipping.trackingNumber).toBe("1ZLEASHDEC1234ABCD");
    expect(shipping.arrivesBy).toBe("2026-11-14T12:00:00.000Z");
  });
});

describe("describeDelivery", () => {
  it("says it's on its way, with the carrier, tracking, day and address", () => {
    const answer = describeDelivery({ outcome: "auto_approved", shipping }, new Date("2026-11-12T09:00:00Z"));
    expect(answer).toMatch(/^On its way with UPS \(tracking 1ZLEASHDEC1234ABCD\), arriving Saturday, Nov 14/);
    expect(answer).toContain("to Sam Lee, 1 Main St, Lisbon, PT");
    expect(answer).toContain("The tracking is on your PayPal order.");
  });

  it("says it's delivered once the day has passed", () => {
    const answer = describeDelivery({ outcome: "approved", shipping }, new Date("2026-11-15T09:00:00Z"));
    expect(answer).toMatch(/^Delivered Saturday, Nov 14/);
  });

  it("explains held, refunded and untracked purchases instead of inventing a date", () => {
    expect(describeDelivery({ outcome: "held", shipping: null })).toContain("ships it once you approve");
    expect(describeDelivery({ outcome: "refunded", shipping })).toMatch(/^Refunded/);
    expect(describeDelivery({ outcome: "auto_approved", shipping: null })).toBe(
      "Paid. The store hasn't shared tracking for it.",
    );
  });
});
