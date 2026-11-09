import "server-only";

// Real PayPal sandbox calls, through PayPal's official server SDK.
// Every payment uses the PayPal account you saved once with PayPal Vault (see /connect),
// so the assistant can pay without showing you a PayPal popup each time.

import {
  ApiError,
  CheckoutPaymentIntent,
  Client,
  Environment,
  OrdersController,
  PaymentsController,
  PaypalPaymentTokenCustomerType,
  PaypalPaymentTokenUsageType,
  VaultController,
  VaultTokenRequestType,
  type Order,
} from "@paypal/paypal-server-sdk";
import { paypalSettings } from "@/server/config/environment";
import * as database from "@/server/database";
import { PayPalError } from "./paypal-error";
import type { PaymentAuthorization, PaymentCapture, PaymentRequest } from "./paypal";

const client = new Client({
  environment: Environment.Sandbox,
  clientCredentialsAuthCredentials: {
    oAuthClientId: paypalSettings.clientId,
    oAuthClientSecret: paypalSettings.clientSecret,
  },
  timeout: 20_000,
});
const orders = new OrdersController(client);
const payments = new PaymentsController(client);
const vault = new VaultController(client);

/** PayPal's negative-testing header: makes the sandbox decline the card on purpose. */
const DECLINE_ON_PURPOSE = JSON.stringify({ mock_application_codes: "INSTRUMENT_DECLINED" });

// ---------- connecting your PayPal account (PayPal Vault) ----------

/** Step 1: ask PayPal for a page where you approve saving your account. Returns its URL. */
export async function startSavingPayPalAccount(returnUrl: string, cancelUrl: string): Promise<string> {
  const { result } = await callPayPal(() =>
    vault.createSetupToken({
      paypalRequestId: crypto.randomUUID(),
      body: {
        paymentSource: {
          paypal: {
            description: "Lets your Leash assistant pay within the rules you set",
            usageType: PaypalPaymentTokenUsageType.Merchant,
            customerType: PaypalPaymentTokenCustomerType.Consumer,
            experienceContext: { brandName: "Leash", returnUrl, cancelUrl },
          },
        },
      },
    }),
  );
  const approvalUrl = result.links?.find((link) => link.rel === "approve")?.href;
  if (!approvalUrl) throw new PayPalError("NO_APPROVAL_LINK", "", "PayPal didn't return an approval page.");
  return approvalUrl;
}

/** Step 2: after you approve, swap the temporary setup token for a permanent vault id. */
export async function finishSavingPayPalAccount(setupTokenId: string) {
  const { result } = await callPayPal(() =>
    vault.createPaymentToken({
      paypalRequestId: crypto.randomUUID(),
      body: { paymentSource: { token: { id: setupTokenId, type: VaultTokenRequestType.SetupToken } } },
    }),
  );
  if (!result.id) throw new PayPalError("NO_VAULT_ID", "", "PayPal didn't return a saved payment method.");
  return { vaultId: result.id, payerEmail: result.paymentSource?.paypal?.emailAddress ?? null };
}

// ---------- moving money ----------

/**
 * Reserves the money from your saved PayPal account. Leash's own sandbox business account is
 * the payee: it stands in for every store, and passes payments to people on (see paypal-payouts.ts).
 */
export async function sandboxAuthorizePayment(payment: PaymentRequest): Promise<PaymentAuthorization> {
  const wallet = await database.wallets.findConnectedWallet();
  if (!wallet) {
    throw new PayPalError("PAYPAL_NOT_CONNECTED", "", "Connect your PayPal account first, on the Connect PayPal page.");
  }

  const { result: order } = await callPayPal(() =>
    orders.createOrder({
      paypalRequestId: crypto.randomUUID(),
      body: {
        intent: CheckoutPaymentIntent.Authorize,
        purchaseUnits: [
          {
            amount: { currencyCode: payment.currency, value: payment.amount.toFixed(2) },
            description: payment.description.slice(0, 127),
          },
        ],
        paymentSource: { paypal: { vaultId: wallet.vaultId } },
      },
    }),
  );

  // With a saved account PayPal usually authorizes straight away. If not, ask it to.
  let authorization = firstAuthorization(order);
  if (!authorization && order.id) {
    const { result } = await callPayPal(() =>
      orders.authorizeOrder({ id: order.id!, paypalRequestId: crypto.randomUUID() }),
    );
    authorization = firstAuthorization(result);
  }
  if (!order.id || !authorization?.id) {
    throw new PayPalError(order.status ?? "NOT_AUTHORIZED", "", "PayPal didn't reserve the money.");
  }
  return { orderId: order.id, authorizationId: authorization.id, status: authorization.status ?? "CREATED" };
}

export async function sandboxCapturePayment(
  authorizationId: string,
  options: { forceDecline: boolean },
): Promise<PaymentCapture> {
  const { result } = await callPayPal(() =>
    payments.captureAuthorizedPayment({
      authorizationId,
      paypalRequestId: crypto.randomUUID(),
      paypalMockResponse: options.forceDecline ? DECLINE_ON_PURPOSE : undefined,
      body: { finalCapture: true },
    }),
  );
  if (result.status === "DECLINED") {
    throw new PayPalError("INSTRUMENT_DECLINED", "", "The payment method was declined.");
  }
  return { captureId: result.id ?? "", status: result.status ?? "COMPLETED" };
}

export async function sandboxVoidAuthorization(authorizationId: string): Promise<{ status: string }> {
  await callPayPal(() => payments.voidPayment({ authorizationId, paypalRequestId: crypto.randomUUID() }));
  return { status: "VOIDED" };
}

export async function sandboxRefundCapture(captureId: string): Promise<{ refundId: string; status: string }> {
  const { result } = await callPayPal(() =>
    payments.refundCapturedPayment({ captureId, paypalRequestId: crypto.randomUUID() }),
  );
  // PayPal marks a finished refund "COMPLETED"; we show "REFUNDED" so it can't be confused with a capture.
  return {
    refundId: result.id ?? "",
    status: result.status === "COMPLETED" ? "REFUNDED" : (result.status ?? "PENDING"),
  };
}

// ---------- helpers ----------

function firstAuthorization(order: Pick<Order, "purchaseUnits">) {
  return order.purchaseUnits?.[0]?.payments?.authorizations?.[0];
}

/** Runs a PayPal call and turns any failure into a PayPalError with PayPal's issue and debug_id. */
async function callPayPal<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw toPayPalError(error);
  }
}

type PayPalErrorBody = {
  name?: string;
  message?: string;
  debug_id?: string;
  details?: { issue?: string; description?: string }[];
};

function toPayPalError(error: unknown): PayPalError {
  if (error instanceof PayPalError) return error;
  if (!(error instanceof ApiError)) {
    return new PayPalError("PAYPAL_UNREACHABLE", "", `Couldn't reach PayPal: ${String(error)}`);
  }
  const body = readErrorBody(error);
  const detail = body.details?.[0];
  return new PayPalError(
    detail?.issue ?? body.name ?? `HTTP_${error.statusCode}`,
    body.debug_id ?? error.headers?.["paypal-debug-id"] ?? "",
    detail?.description ?? body.message ?? error.message,
  );
}

function readErrorBody(error: ApiError): PayPalErrorBody {
  if (error.result && typeof error.result === "object") return error.result as PayPalErrorBody;
  try {
    return typeof error.body === "string" ? (JSON.parse(error.body) as PayPalErrorBody) : {};
  } catch {
    return {};
  }
}
