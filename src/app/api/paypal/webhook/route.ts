// POST /api/paypal/webhook
// PayPal calls this when a payment changes (captured, voided, refunded, declined).
// The body is read as raw text because PayPal checks its signature against the exact bytes.

import { apiRoute } from "@/server/http";
import { handlePayPalWebhook } from "@/server/payments/paypal-webhooks";

export const POST = apiRoute(async (request: Request) => {
  return Response.json(await handlePayPalWebhook(request.headers, await request.text()));
});
