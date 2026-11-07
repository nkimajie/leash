// GET /api/paypal/connect/return?approval_token_id=...
// PayPal sends you here after you approve saving your account. We save it, then send you
// back to the Connect PayPal page with the result.

import { appUrl } from "@/server/config/environment";
import { finishConnectingPayPal } from "@/server/payments/paypal-connection";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const backToConnectPage = (result: string) => Response.redirect(`${appUrl || url.origin}/connect?result=${result}`);

  const setupTokenId = url.searchParams.get("approval_token_id") ?? url.searchParams.get("token");
  if (!setupTokenId) return backToConnectPage("missing-approval");
  try {
    await finishConnectingPayPal(setupTokenId);
    return backToConnectPage("connected");
  } catch (error) {
    console.error("Connecting PayPal failed", error);
    return backToConnectPage("failed");
  }
}
