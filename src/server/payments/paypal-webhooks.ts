import "server-only";

// PayPal webhooks: PayPal tells us when something happens to a payment (captured, voided,
// refunded, declined). We check the message really came from PayPal, then record the new
// status on the matching decision so the control room always shows what PayPal says.
// Webhooks only record what happened; they never move money.

import { paypalSettings } from "@/server/config/environment";
import * as database from "@/server/database";
import { BadRequestError, UnauthorizedError } from "@/server/errors";

const PAYPAL_API = "https://api-m.sandbox.paypal.com";

/** The PayPal events we care about, and the status each one means. */
const STATUS_FOR_EVENT: Record<string, string> = {
  "PAYMENT.AUTHORIZATION.CREATED": "CREATED",
  "PAYMENT.AUTHORIZATION.VOIDED": "VOIDED",
  "PAYMENT.CAPTURE.COMPLETED": "COMPLETED",
  "PAYMENT.CAPTURE.DECLINED": "DECLINED",
  "PAYMENT.CAPTURE.DENIED": "DENIED",
  "PAYMENT.CAPTURE.PENDING": "PENDING",
  "PAYMENT.CAPTURE.REFUNDED": "REFUNDED",
};

type WebhookEvent = {
  event_type?: string;
  resource?: { id?: string; links?: { rel: string; href: string }[] };
};

export async function handlePayPalWebhook(headers: Headers, rawBody: string): Promise<{ recorded: boolean }> {
  if (!paypalSettings.webhookId) throw new BadRequestError("PAYPAL_WEBHOOK_ID isn't set, so webhooks are off.");
  if (!(await isFromPayPal(headers, rawBody))) throw new UnauthorizedError("This webhook didn't come from PayPal.");

  const event = JSON.parse(rawBody) as WebhookEvent;
  const status = STATUS_FOR_EVENT[event.event_type ?? ""];
  const paypalId = paymentIdFrom(event);
  if (!status || !paypalId) return { recorded: false };

  const decision = await database.decisions.findDecisionByPayPalId(paypalId);
  if (!decision) return { recorded: false };
  await database.decisions.updateDecision(decision.id, { paypal: { status } });
  return { recorded: true };
}

/** Refund events are about the refund; the capture they belong to is in the "up" link. */
function paymentIdFrom(event: WebhookEvent): string | undefined {
  if (event.event_type === "PAYMENT.CAPTURE.REFUNDED") {
    const captureLink = event.resource?.links?.find((link) => link.rel === "up")?.href;
    return captureLink?.split("/").pop();
  }
  return event.resource?.id;
}

/** Asks PayPal to confirm the signature, so nobody else can fake a webhook. */
async function isFromPayPal(headers: Headers, rawBody: string): Promise<boolean> {
  const response = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await getAccessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: paypalSettings.webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  });
  if (!response.ok) return false;
  const { verification_status } = (await response.json()) as { verification_status?: string };
  return verification_status === "SUCCESS";
}

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${paypalSettings.clientId}:${paypalSettings.clientSecret}`).toString("base64");
  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) throw new Error(`PayPal sign-in failed with HTTP ${response.status}`);
  const { access_token } = (await response.json()) as { access_token: string };
  return access_token;
}
