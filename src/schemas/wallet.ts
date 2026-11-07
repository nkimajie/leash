import { z } from "zod";

/**
 * Your PayPal account, saved once with PayPal Vault. The assistant pays with `vaultId`
 * from then on, so you never see a PayPal popup again.
 */
export const WalletSchema = z.object({
  id: z.string(),
  vaultId: z.string(),
  payerEmail: z.string().nullable(),
  createdAt: z.string(),
});

export type Wallet = z.infer<typeof WalletSchema>;

/** What the Connect PayPal page shows. */
export type PayPalConnection = {
  mode: "paypal-sandbox" | "mock";
  /** Mock payments need no account, so they always count as connected. */
  connected: boolean;
  payerEmail: string | null;
  connectedAt: string | null;
};
