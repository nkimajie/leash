// Delivery: where a purchase is once it's paid. The stores in this sandbox demo don't really ship,
// so a stand-in store does: it picks a carrier and tracking number, and the spending service adds
// them to the real PayPal order. Pure functions with no database or network calls, so they're tested.

import type { Decision, Shipping } from "@/schemas";
import { formatDay } from "@/lib/format";

/** The stand-in store ships with UPS (one of PayPal's tracking carriers) and delivers in 3 days. */
export const CARRIER = "UPS";
export const DAYS_TO_DELIVER = 3;

/** A UPS-style tracking number that is clearly Leash's: "1ZLEASH" and the purchase's id. */
export function planShipment(
  decisionId: string,
  shippedAt: Date,
): Pick<Shipping, "carrier" | "trackingNumber" | "shippedAt" | "arrivesBy"> {
  const fromId = decisionId
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 11)
    .padEnd(11, "0");
  return {
    carrier: CARRIER,
    trackingNumber: `1ZLEASH${fromId}`,
    shippedAt: shippedAt.toISOString(),
    arrivesBy: new Date(shippedAt.getTime() + DAYS_TO_DELIVER * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/** Where it is, in a sentence: "On its way with UPS (tracking 1ZLEASH…), arriving Saturday, Nov 14, to …". */
export function describeDelivery(decision: Pick<Decision, "outcome" | "shipping">, now = new Date()): string {
  const { outcome, shipping } = decision;
  if (outcome === "held") return "Waiting for your okay. The store ships it once you approve.";
  if (outcome === "refunded") return "Refunded: your money is back, so there's nothing to deliver.";
  if (outcome !== "auto_approved" && outcome !== "approved") return "Not bought, so nothing ships.";
  if (!shipping) return "Paid. The store hasn't shared tracking for it.";

  const to = shipping.shipTo ? `, to ${shipping.shipTo}` : "";
  const onPayPal = shipping.onPayPalOrder ? " The tracking is on your PayPal order." : "";
  const day = formatDay(shipping.arrivesBy);
  if (now < new Date(shipping.arrivesBy)) {
    return `On its way with ${shipping.carrier} (tracking ${shipping.trackingNumber}), arriving ${day}${to}.${onPayPal}`;
  }
  return `Delivered ${day}${to}, with ${shipping.carrier} (tracking ${shipping.trackingNumber}).${onPayPal}`;
}
