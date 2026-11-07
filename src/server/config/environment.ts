import "server-only";

// Reads environment variables in one place and decides which services run for real.
// A service runs in mock mode whenever its keys are missing, so the app always works.

import type { ServiceModes } from "@/schemas";

const env = process.env;

export const paypalSettings = {
  clientId: env.PAYPAL_CLIENT_ID ?? "",
  clientSecret: env.PAYPAL_CLIENT_SECRET ?? "",
  /** Set after creating a webhook in the PayPal developer dashboard. */
  webhookId: env.PAYPAL_WEBHOOK_ID ?? "",
};

export const supabaseSettings = {
  url: env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  /** Full access, so it stays on the server. The browser only gets the read-only anon key. */
  serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
};

export const channel3ApiKey = env.CHANNEL3_API_KEY ?? "";

/**
 * The public address of the app, e.g. https://leash.onrender.com. PayPal sends you back here
 * after you connect your account. Optional: without it, the address of the current request is used.
 */
export const appUrl = env.APP_URL?.replace(/\/$/, "") ?? "";

/** Shared secret the daily Render Cron Job sends to /api/keepalive. */
export const cronSecret = env.CRON_SECRET ?? "";

export function serviceModes(): ServiceModes {
  return {
    payments: paypalSettings.clientId && paypalSettings.clientSecret ? "paypal-sandbox" : "mock",
    assistant: env.ANTHROPIC_API_KEY ? "claude" : "mock",
    productSearch: channel3ApiKey ? "channel3" : "mock",
    database: supabaseSettings.url && supabaseSettings.serviceRoleKey ? "supabase" : "memory",
    forceDeclinedPayments: env.DEMO_FORCE_DECLINE === "true",
    demoMode: env.DEMO_MODE === "true",
  };
}
