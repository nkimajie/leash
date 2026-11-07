// POST /api/paypal/connect
// Starts connecting your PayPal account. Returns the PayPal page where you approve it.

import { appUrl } from "@/server/config/environment";
import { apiRoute } from "@/server/http";
import { startConnectingPayPal } from "@/server/payments/paypal-connection";

export const POST = apiRoute(async (request: Request) => {
  return Response.json(await startConnectingPayPal(appUrl || new URL(request.url).origin));
});
