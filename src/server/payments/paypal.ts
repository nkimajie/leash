import "server-only";

// The payments section: the only door to PayPal. The rest of the app calls these functions
// and never knows whether PayPal is real (sandbox) or mocked.
//
//   authorizePayment     reserve the money (PayPal order with intent AUTHORIZE)
//   capturePayment       take the reserved money
//   voidAuthorization    release the reservation; the buyer is never charged
//   refundCapture        give captured money back
//   sendToPerson         pass a payment on to a person's PayPal email (Payouts)
//   addTracking          put a shipment's carrier and tracking number on the PayPal order
//   findShippingAddress  where your saved PayPal account ships to (PayPal Vault)
//
// Real sandbox calls live in ./paypal-sandbox.ts and ./paypal-payouts.ts; the stand-in is ./mock-paypal.ts.

import { serviceModes } from "@/server/config/environment";
import {
  mockAddTracking,
  mockAuthorizePayment,
  mockCapturePayment,
  mockFindShippingAddress,
  mockRefundCapture,
  mockSendToPerson,
  mockVoidAuthorization,
} from "./mock-paypal";
import { sandboxSendToPerson } from "./paypal-payouts";
import {
  sandboxAddTracking,
  sandboxAuthorizePayment,
  sandboxCapturePayment,
  sandboxFindShippingAddress,
  sandboxRefundCapture,
  sandboxVoidAuthorization,
} from "./paypal-sandbox";

export { PayPalError } from "./paypal-error";

export type PaymentRequest = { amount: number; currency: string; description: string };
export type PaymentAuthorization = { orderId: string; authorizationId: string; status: string };
export type PaymentCapture = { captureId: string; status: string };
export type PersonPayout = {
  email: string;
  amount: number;
  currency: string;
  note: string;
  /** Unique per payment. PayPal refuses a second payout with the same reference, so a retry can't pay twice. */
  reference: string;
};
export type SentPayout = { payoutId: string; status: string };
export type Shipment = { carrier: string; trackingNumber: string };

const isSandbox = () => serviceModes().payments === "paypal-sandbox";

export async function authorizePayment(payment: PaymentRequest): Promise<PaymentAuthorization> {
  return isSandbox() ? sandboxAuthorizePayment(payment) : mockAuthorizePayment(payment);
}

export async function capturePayment(authorizationId: string): Promise<PaymentCapture> {
  // Demo switch (DEMO_FORCE_DECLINE=true): the capture is declined on purpose, to show a failure.
  const forceDecline = serviceModes().forceDeclinedPayments;
  return isSandbox() ? sandboxCapturePayment(authorizationId, { forceDecline }) : mockCapturePayment({ forceDecline });
}

export async function voidAuthorization(authorizationId: string): Promise<{ status: string }> {
  return isSandbox() ? sandboxVoidAuthorization(authorizationId) : mockVoidAuthorization();
}

export async function refundCapture(captureId: string): Promise<{ refundId: string; status: string }> {
  return isSandbox() ? sandboxRefundCapture(captureId) : mockRefundCapture();
}

export async function sendToPerson(payout: PersonPayout): Promise<SentPayout> {
  return isSandbox() ? sandboxSendToPerson(payout) : mockSendToPerson(payout);
}

export async function addTracking(orderId: string, captureId: string, shipment: Shipment): Promise<void> {
  return isSandbox() ? sandboxAddTracking(orderId, captureId, shipment) : mockAddTracking();
}

export async function findShippingAddress(): Promise<string | null> {
  return isSandbox() ? sandboxFindShippingAddress() : mockFindShippingAddress();
}
