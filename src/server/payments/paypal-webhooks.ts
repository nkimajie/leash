import "server-only";

// PayPal webhooks: PayPal tells us when something happens to a payment (captured, voided,
// refunded, declined), or to money sent on to a person (received, unclaimed, returned).
// We check the message really came from PayPal, then record the new status on the matching
// decision so Money always shows what PayPal says.
// Webhooks only record what happened; they never move money.

import { paypalSettings } from "@/server/config/environment";
import * as database from "@/server/database";
import { BadRequestError, UnauthorizedError } from "@/server/errors";
import { PAYPAL_API, getAccessToken } from "./paypal-rest";

/** The PayPal events we care about, and the status each one means. */
const STATUS_FOR_EVENT: Record<string, string> = {
  "PAYMENT.AUTHORIZATION.VOIDED": "VOIDED",
  "PAYMENT.CAPTURE.COMPLETED": "COMPLETED",
  "PAYMENT.CAPTURE.DECLINED": "DECLINED",
  "PAYMENT.CAPTURE.DENIED": "DENIED",
  "PAYMENT.CAPTURE.PENDING": "PENDING",
  "PAYMENT.CAPTURE.REFUNDED": "REFUNDED",
  // Payouts finish after we've sent them: these say what happened at the person's end.
  "PAYMENT.PAYOUTS-ITEM.SUCCEEDED": "SUCCESS",
  "PAYMENT.PAYOUTS-ITEM.UNCLAIMED": "UNCLAIMED",
  "PAYMENT.PAYOUTS-ITEM.FAILED": "FAILED",
  "PAYMENT.PAYOUTS-ITEM.RETURNED": "RETURNED",
  "PAYMENT.PAYOUTS-ITEM.BLOCKED": "BLOCKED",
};

type WebhookEvent = {
  event_type?: string;
  resource?: { id?: string; payout_batch_id?: string; links?: { rel: string; href: string }[] };
};

export async function handlePayPalWebhook(headers: Headers, rawBody: string): Promise<{ recorded: boolean }> {
  if (!paypalSettings.webhookId) throw new BadRequestError("PAYPAL_WEBHOOK_ID isn't set, so webhooks are off.");
  if (!(await isFromPayPal(headers, rawBody))) throw new UnauthorizedError("This webhook didn't come from PayPal.");

  const event = JSON.parse(rawBody) as WebhookEvent;
  const status = STATUS_FOR_EVENT[event.event_type ?? ""];
  const paypalId = paymentIdFrom(event);
  if (!status || !paypalId) return { recorded: false };

  const decision = await database.decisions.findDecisionByPayPalId(paypalId);
  if (!decision || !isNewer(event.event_type!, decision.paypal)) return { recorded: false };
  await database.decisions.updateDecision(decision.id, { paypal: { status } });
  return { recorded: true };
}

/**
 * PayPal doesn't promise to deliver webhooks in order, and Leash already records each step itself.
 * So a late "capture completed" only finishes a capture that was pending, and once money has been
 * sent on to a person, only news about that payout is recorded.
 */
function isNewer(eventType: string, current: { status: string | null; payoutId: string | null }): boolean {
  if (eventType === "PAYMENT.CAPTURE.COMPLETED") return current.status === "PENDING";
  if (current.payoutId) return eventType.startsWith("PAYMENT.PAYOUTS-ITEM.");
  return true;
}

/**
 * The PayPal id that matches a decision. Refund events are about the refund, so the capture
 * they belong to is in the "up" link; payout events are found by their payout batch.
 */
function paymentIdFrom(event: WebhookEvent): string | undefined {
  if (event.event_type?.startsWith("PAYMENT.PAYOUTS-ITEM.")) return event.resource?.payout_batch_id;
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
