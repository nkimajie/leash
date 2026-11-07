import "server-only";

// The payments section: the only door to PayPal. The rest of the app calls these four
// functions and never knows whether PayPal is real (sandbox) or mocked.
//
//   authorizePayment   reserve the money (PayPal order with intent AUTHORIZE)
//   capturePayment     take the reserved money
//   voidAuthorization  release the reservation; the buyer is never charged
//   refundCapture      give captured money back
//
// Real sandbox calls live in ./paypal-sandbox.ts; the stand-in is ./mock-paypal.ts.

import { serviceModes } from "@/server/config/environment";
import { mockAuthorizePayment, mockCapturePayment, mockRefundCapture, mockVoidAuthorization } from "./mock-paypal";
import {
  sandboxAuthorizePayment,
  sandboxCapturePayment,
  sandboxRefundCapture,
  sandboxVoidAuthorization,
} from "./paypal-sandbox";

export { PayPalError } from "./paypal-error";

export type PaymentRequest = {
  amount: number;
  currency: string;
  description: string;
  /** True when sending money to a person rather than buying from a merchant. */
  paysPerson: boolean;
  /** The person's PayPal email. Purchases go to the merchant, so they leave this empty. */
  recipientEmail?: string | null;
};
export type PaymentAuthorization = { orderId: string; authorizationId: string; status: string };
export type PaymentCapture = { captureId: string; status: string };

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
