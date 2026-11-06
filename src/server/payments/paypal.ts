import "server-only";

// The payments section: the only place that talks to PayPal.
//
//   authorizePayment   reserve the money (PayPal order with intent AUTHORIZE)
//   capturePayment     take the reserved money
//   voidAuthorization  release the reservation; the buyer is never charged
//   refundCapture      give captured money back
//
// Mock mode runs when PayPal keys are missing. TODO(step 4): real sandbox calls through
// @paypal/paypal-server-sdk, paying with the saved PayPal Vault payment method.

import { serviceModes } from "@/server/config/environment";
import { mockAuthorizePayment, mockCapturePayment, mockRefundCapture, mockVoidAuthorization } from "./mock-paypal";

export { PayPalError } from "./paypal-error";

export type PaymentRequest = {
  amount: number;
  currency: string;
  description: string;
  /** For payments to people: who receives the money. Purchases go to the merchant. */
  recipientEmail?: string | null;
};
export type PaymentAuthorization = { orderId: string; authorizationId: string; status: string };
export type PaymentCapture = { captureId: string; status: string };

export async function authorizePayment(payment: PaymentRequest): Promise<PaymentAuthorization> {
  return mockAuthorizePayment(payment);
}

export async function capturePayment(authorizationId: string): Promise<PaymentCapture> {
  void authorizationId;
  // Demo switch: in sandbox this becomes the header
  // PayPal-Mock-Response: {"mock_application_codes": "INSTRUMENT_DECLINED"}
  return mockCapturePayment({ forceDecline: serviceModes().forceDeclinedPayments });
}

export async function voidAuthorization(authorizationId: string): Promise<{ status: string }> {
  void authorizationId;
  return mockVoidAuthorization();
}

export async function refundCapture(captureId: string): Promise<{ refundId: string; status: string }> {
  void captureId;
  return mockRefundCapture();
}
