import "server-only";

import type { Wallet } from "@/schemas";
import { memoryTables, newId, timestampNow } from "./store";

/** The PayPal account you connected, or null if you haven't connected one yet. */
export async function findConnectedWallet(): Promise<Wallet | null> {
  return memoryTables.wallet;
}

/** Saves your PayPal account, replacing any earlier one. */
export async function saveConnectedWallet(vaultId: string, payerEmail: string | null): Promise<Wallet> {
  memoryTables.wallet = { id: newId(), vaultId, payerEmail, createdAt: timestampNow() };
  return memoryTables.wallet;
}

export async function disconnectWallet(): Promise<void> {
  memoryTables.wallet = null;
}
