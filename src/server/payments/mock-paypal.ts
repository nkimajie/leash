import "server-only";

// Stand-in for PayPal when no sandbox keys are set. Returns IDs shaped like PayPal's,
// with a short delay, so the rest of the app behaves exactly as it will for real.

import { PayPalError } from "./paypal-error";
import type { PaymentAuthorization, PaymentCapture, PaymentRequest, PersonPayout, SentPayout } from "./paypal";

export async function mockAuthorizePayment(payment: PaymentRequest): Promise<PaymentAuthorization> {
  await simulateNetworkDelay();
  void payment;
  return { orderId: fakePayPalId(), authorizationId: fakePayPalId(), status: "AUTHORIZED" };
}

export async function mockCapturePayment(options: { forceDecline: boolean }): Promise<PaymentCapture> {
  await simulateNetworkDelay();
  if (options.forceDecline) {
    throw new PayPalError("INSTRUMENT_DECLINED", fakeDebugId(), "The payment method was declined.");
  }
  return { captureId: fakePayPalId(), status: "COMPLETED" };
}

export async function mockVoidAuthorization() {
  await simulateNetworkDelay();
  return { status: "VOIDED" };
}

export async function mockRefundCapture() {
  await simulateNetworkDelay();
  return { refundId: fakePayPalId(), status: "REFUNDED" };
}

export async function mockSendToPerson(payout: PersonPayout): Promise<SentPayout> {
  await simulateNetworkDelay();
  void payout;
  return { payoutId: fakePayPalId().slice(0, 13), status: "PENDING" };
}

export async function mockAddTracking() {
  await simulateNetworkDelay();
}

/** The sample person you sign in as in mock mode lives here. */
export async function mockFindShippingAddress() {
  return "Favor, 12 Sample Street, London, E1 6AN, GB";
}

const ID_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
const fakePayPalId = () =>
  Array.from({ length: 17 }, () => ID_CHARACTERS[Math.floor(Math.random() * ID_CHARACTERS.length)]).join("");
const fakeDebugId = () => Math.random().toString(16).slice(2, 15);
const simulateNetworkDelay = () => new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 250));
