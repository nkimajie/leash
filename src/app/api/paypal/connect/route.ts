// POST /api/paypal/connect   { then: "welcome" | "paypal" }
// Starts connecting your PayPal account (signing in). Returns the PayPal page where you approve it.

import { ConnectPayPalBody } from "@/schemas";
import { appUrl } from "@/server/config/environment";
import { apiRoute, readJsonBody } from "@/server/http";
import { startConnectingPayPal } from "@/server/payments/paypal-connection";

export const POST = apiRoute(async (request: Request) => {
  const { then } = await readJsonBody(request, ConnectPayPalBody);
  return Response.json(await startConnectingPayPal(appUrl || new URL(request.url).origin, then));
});
