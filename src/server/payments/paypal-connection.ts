import "server-only";

// Signing in to Leash is connecting your PayPal account, once, so the assistant can pay without a
// popup each time. PayPal also tells Leash your name and email.
//
//   1. startConnectingPayPal   PayPal gives us a page where you approve saving your account
//   2. you approve on PayPal   PayPal sends you back to /api/paypal/connect/return
//   3. finishConnectingPayPal  we swap the approval for a permanent vault id and save it
//
// In mock mode there is no PayPal to visit: you continue as a sample person, and payments are simulated.

import type { ConnectPayPalThen, PayPalConnection } from "@/schemas";
import { serviceModes } from "@/server/config/environment";
import * as database from "@/server/database";
import { BadRequestError } from "@/server/errors";
import { finishSavingPayPalAccount, startSavingPayPalAccount } from "./paypal-sandbox";

const MOCK_PERSON = { vaultId: "mock-vault", name: "Favor", email: "favor@example.com" };

export async function getPayPalConnection(): Promise<PayPalConnection> {
  const mode = serviceModes().payments;
  const saved = await database.wallets.findConnectedWallet();
  // A sample person saved in mock mode can't pay with real PayPal.
  const wallet = mode === "paypal-sandbox" && saved?.vaultId === MOCK_PERSON.vaultId ? null : saved;
  return {
    mode,
    signedIn: wallet !== null,
    connected: mode === "mock" || wallet !== null,
    payerName: wallet?.payerName ?? null,
    payerEmail: wallet?.payerEmail ?? null,
    connectedAt: wallet?.createdAt ?? null,
    canDisconnect: !serviceModes().demoMode,
  };
}

/** Returns the PayPal page where you approve saving your account (in mock mode, the page after it). */
export async function startConnectingPayPal(appUrl: string, then: ConnectPayPalThen): Promise<{ approvalUrl: string }> {
  const backTo = `${appUrl}${pageAfterPayPal(then)}`;
  if (serviceModes().payments === "mock") {
    await database.wallets.saveConnectedWallet(MOCK_PERSON.vaultId, MOCK_PERSON.email, MOCK_PERSON.name);
    return { approvalUrl: `${backTo}?result=connected` };
  }
  const approvalUrl = await startSavingPayPalAccount(
    `${appUrl}/api/paypal/connect/return?then=${then}`,
    `${backTo}?result=cancelled`,
  );
  return { approvalUrl };
}

/** PayPal sent you back after you approved: save the account for future payments. */
export async function finishConnectingPayPal(setupTokenId: string): Promise<void> {
  const { vaultId, payerEmail, payerName } = await finishSavingPayPalAccount(setupTokenId);
  await database.wallets.saveConnectedWallet(vaultId, payerEmail, payerName);
}

/** Signing out forgets the saved PayPal account. */
export async function disconnectPayPal(): Promise<void> {
  if (serviceModes().demoMode) {
    throw new BadRequestError("Signing out is turned off in the demo, so the next person can still try it.");
  }
  await database.wallets.disconnectWallet();
}

export const pageAfterPayPal = (then: ConnectPayPalThen) => (then === "welcome" ? "/welcome" : "/leash/paypal");
