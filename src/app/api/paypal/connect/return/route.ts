// GET /api/paypal/connect/return?then=welcome&approval_token_id=...
// PayPal sends you here after you approve saving your account. We save it, then send you back
// to where you started (the welcome steps, or the PayPal tab) with the result.

import { ConnectPayPalBody } from "@/schemas";
import { appUrl } from "@/server/config/environment";
import { finishConnectingPayPal, pageAfterPayPal } from "@/server/payments/paypal-connection";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const then = ConnectPayPalBody.parse({ then: url.searchParams.get("then") ?? undefined }).then;
  const goBack = (result: string) => Response.redirect(`${appUrl || url.origin}${pageAfterPayPal(then)}?result=${result}`);

  const setupTokenId = url.searchParams.get("approval_token_id") ?? url.searchParams.get("token");
  if (!setupTokenId) return goBack("missing-approval");
  try {
    await finishConnectingPayPal(setupTokenId);
    return goBack("connected");
  } catch (error) {
    console.error("Connecting PayPal failed", error);
    return goBack("failed");
  }
}
