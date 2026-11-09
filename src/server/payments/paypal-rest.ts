import "server-only";

// PayPal's REST API, called directly for the two things PayPal's server SDK doesn't cover:
// Payouts (sending money on to a person) and checking a webhook's signature.

import { paypalSettings } from "@/server/config/environment";

export const PAYPAL_API = "https://api-m.sandbox.paypal.com";

export async function getAccessToken(): Promise<string> {
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
