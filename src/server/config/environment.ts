import "server-only";

// Reads environment variables in one place and decides which services run for real.
// A service runs in mock mode whenever its keys are missing, so the app always works.

import type { ServiceModes } from "@/schemas";

const env = process.env;

export const paypalCredentials = {
  clientId: env.PAYPAL_CLIENT_ID ?? "",
  clientSecret: env.PAYPAL_CLIENT_SECRET ?? "",
  webhookId: env.PAYPAL_WEBHOOK_ID ?? "",
};

export function serviceModes(): ServiceModes {
  return {
    payments: paypalCredentials.clientId && paypalCredentials.clientSecret ? "paypal-sandbox" : "mock",
    assistant: env.ANTHROPIC_API_KEY ? "claude" : "mock",
    productSearch: env.CHANNEL3_API_KEY ? "channel3" : "mock",
    database: "memory", // TODO(step 6): "supabase" when its keys are set
    forceDeclinedPayments: env.DEMO_FORCE_DECLINE === "true",
  };
}
