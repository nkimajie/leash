import "server-only";

// Connecting your PayPal account once, so the assistant can pay without a popup each time.
//
//   1. startConnectingPayPal   PayPal gives us a page where you approve saving your account
//   2. you approve on PayPal   PayPal sends you back to /api/paypal/connect/return
//   3. finishConnectingPayPal  we swap the approval for a permanent vault id and save it
//
// In mock mode there is nothing to connect: payments are simulated.

import type { PayPalConnection } from "@/schemas";
import { serviceModes } from "@/server/config/environment";
import * as database from "@/server/database";
import { BadRequestError } from "@/server/errors";
import { finishSavingPayPalAccount, startSavingPayPalAccount } from "./paypal-sandbox";

export async function getPayPalConnection(): Promise<PayPalConnection> {
  const mode = serviceModes().payments;
  const wallet = mode === "paypal-sandbox" ? await database.wallets.findConnectedWallet() : null;
  return {
    mode,
    connected: mode === "mock" || wallet !== null,
    payerEmail: wallet?.payerEmail ?? null,
    connectedAt: wallet?.createdAt ?? null,
  };
}

/** Returns the PayPal page where you approve saving your account. */
export async function startConnectingPayPal(appUrl: string): Promise<{ approvalUrl: string }> {
  if (serviceModes().payments === "mock") {
    throw new BadRequestError("PayPal is in mock mode, so there is nothing to connect. Add sandbox keys first.");
  }
  const approvalUrl = await startSavingPayPalAccount(
    `${appUrl}/api/paypal/connect/return`,
    `${appUrl}/connect?result=cancelled`,
  );
  return { approvalUrl };
}

/** PayPal sent you back after you approved: save the account for future payments. */
export async function finishConnectingPayPal(setupTokenId: string): Promise<void> {
  const { vaultId, payerEmail } = await finishSavingPayPalAccount(setupTokenId);
  await database.wallets.saveConnectedWallet(vaultId, payerEmail);
}

export async function disconnectPayPal(): Promise<void> {
  await database.wallets.disconnectWallet();
}
