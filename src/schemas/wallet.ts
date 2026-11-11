import { z } from "zod";

/**
 * Your PayPal account, saved once with PayPal Vault. The assistant pays with `vaultId`
 * from then on, so you never see a PayPal popup again. Saving it is also how you sign in:
 * PayPal tells Leash your name and email.
 */
export const WalletSchema = z.object({
  id: z.string(),
  vaultId: z.string(),
  payerEmail: z.string().nullable(),
  payerName: z.string().nullable(),
  createdAt: z.string(),
});

export type Wallet = z.infer<typeof WalletSchema>;

/** Who you are, and whether Leash can pay with your PayPal. */
export type PayPalConnection = {
  mode: "paypal-sandbox" | "mock";
  /** You continued with PayPal (in mock mode, as a sample person). */
  signedIn: boolean;
  /** Mock payments need no account, so they always count as connected. */
  connected: boolean;
  payerName: string | null;
  payerEmail: string | null;
  connectedAt: string | null;
  /** False in demo mode, so one visitor can't sign out the next. */
  canDisconnect: boolean;
};

/** Where PayPal sends you back to: the welcome steps, or the PayPal tab of Your leash. */
export const ConnectPayPalBody = z.object({ then: z.enum(["welcome", "paypal"]).default("paypal") });
export type ConnectPayPalThen = z.infer<typeof ConnectPayPalBody>["then"];
