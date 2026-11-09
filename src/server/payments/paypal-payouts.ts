import "server-only";

// Sending money on to a person with PayPal Payouts.
//
// A PayPal account saved with Vault can only pay the app that saved it. So "pay Sam $25"
// happens in two steps: your PayPal pays Leash (reserved, then captured, like a purchase),
// and Leash sends the same $25 straight on to Sam's PayPal email with Payouts.
// If Sam has no PayPal account yet, PayPal emails Sam a link to claim it.

import { PayPalError } from "./paypal-error";
import { PAYPAL_API, getAccessToken } from "./paypal-rest";
import type { PersonPayout, SentPayout } from "./paypal";

type PayoutResponse = {
  batch_header?: { payout_batch_id?: string; batch_status?: string };
  name?: string;
  message?: string;
  debug_id?: string;
  details?: { issue?: string }[];
};

export async function sandboxSendToPerson(payout: PersonPayout): Promise<SentPayout> {
  let response: Response;
  try {
    response = await fetch(`${PAYPAL_API}/v1/payments/payouts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await getAccessToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        // PayPal refuses a second batch with the same id, so a retry can never pay twice.
        sender_batch_header: { sender_batch_id: crypto.randomUUID(), email_subject: "You've received money" },
        items: [
          {
            recipient_type: "EMAIL",
            receiver: payout.email,
            amount: { value: payout.amount.toFixed(2), currency: payout.currency },
            note: payout.note.slice(0, 4000),
          },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new PayPalError("PAYPAL_UNREACHABLE", "", `Couldn't reach PayPal: ${String(error)}`);
  }

  const body = (await response.json().catch(() => ({}))) as PayoutResponse;
  const batch = body.batch_header;
  if (!response.ok || !batch?.payout_batch_id) {
    throw new PayPalError(
      body.details?.[0]?.issue ?? body.name ?? `HTTP_${response.status}`,
      body.debug_id ?? "",
      body.message ?? "PayPal didn't send the money on.",
    );
  }
  return { payoutId: batch.payout_batch_id, status: batch.batch_status ?? "PENDING" };
}
