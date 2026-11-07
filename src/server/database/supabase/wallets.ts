import "server-only";

import type { Wallet } from "@/schemas";
import { connectToSupabase, dataOrThrow } from "./client";
import { toWallet } from "./rows";

/** The PayPal account you connected, or null if you haven't connected one yet. */
export async function findConnectedWallet(): Promise<Wallet | null> {
  const db = await connectToSupabase();
  const row = dataOrThrow(
    await db.from("wallets").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    "find your PayPal account",
  );
  return row ? toWallet(row) : null;
}

/** Saves your PayPal account, replacing any earlier one. */
export async function saveConnectedWallet(vaultId: string, payerEmail: string | null): Promise<Wallet> {
  const db = await connectToSupabase();
  dataOrThrow(await db.from("wallets").delete().eq("user_id", "demo"), "replace your PayPal account");
  const row = dataOrThrow(
    await db.from("wallets").insert({ paypal_vault_id: vaultId, payer_email: payerEmail }).select().single(),
    "save your PayPal account",
  );
  return toWallet(row);
}

export async function disconnectWallet(): Promise<void> {
  const db = await connectToSupabase();
  dataOrThrow(await db.from("wallets").delete().eq("user_id", "demo"), "disconnect your PayPal account");
}
