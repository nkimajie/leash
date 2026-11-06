// PayPal wrapper: authorize, capture, void, refund.
//
// Mock mode runs when PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are missing, returning fake IDs
// shaped like PayPal's so the rest of the app cannot tell the difference.
// TODO(step 4): real sandbox calls through @paypal/paypal-server-sdk, then Vault.

import type { Product } from "./types";

export const paypalIsMock = !process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET;

// Demo switch: makes capture fail with INSTRUMENT_DECLINED. In real mode this becomes the
// `PayPal-Mock-Response` header that the sandbox understands.
export const forceDecline = () => process.env.DEMO_FORCE_DECLINE === "true";

export class PayPalError extends Error {
  constructor(
    public issue: string, // details[0].issue from PayPal, e.g. INSTRUMENT_DECLINED
    public debugId: string, // debug_id from PayPal, stored in the decisions table
    message: string,
  ) {
    super(message);
    this.name = "PayPalError";
  }
}

export type Authorization = { orderId: string; authId: string; status: string };
export type Capture = { captureId: string; status: string };

// Create an order with intent AUTHORIZE: the money is reserved, not taken.
export async function authorize(product: Product): Promise<Authorization> {
  await latency();
  void product;
  return { orderId: fakeId(), authId: fakeId(), status: "AUTHORIZED" };
}

// Take the reserved money.
export async function capture(authId: string): Promise<Capture> {
  await latency();
  void authId;
  if (forceDecline()) {
    throw new PayPalError(
      "INSTRUMENT_DECLINED",
      fakeDebugId(),
      "The payment method was declined by the processor.",
    );
  }
  return { captureId: fakeId(), status: "COMPLETED" };
}

// Release the reserved money. The buyer is never charged.
export async function voidAuthorization(authId: string): Promise<{ status: string }> {
  await latency();
  void authId;
  return { status: "VOIDED" };
}

export async function refund(captureId: string): Promise<{ refundId: string; status: string }> {
  await latency();
  void captureId;
  return { refundId: fakeId(), status: "REFUNDED" };
}

// --- mock helpers ---
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
function fakeId(length = 17) {
  return Array.from({ length }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
}
function fakeDebugId() {
  return Math.random().toString(16).slice(2, 15);
}
function latency() {
  return new Promise((r) => setTimeout(r, 250 + Math.random() * 250));
}
