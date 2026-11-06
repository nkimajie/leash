// Sample history so the control room is never empty. Covers every verdict.

import { MOCK_CATALOG } from "./channel3";
import type { Decision, Verdict } from "./types";

type SeedRow = {
  productId: string;
  hoursAgo: number;
  verdict: Verdict;
  rule_hit: string;
  ai_reasoning: string;
  paypal_status: string | null;
  debug?: boolean;
};

const ROWS: SeedRow[] = [
  {
    productId: "off-1",
    hoursAgo: 50,
    verdict: "auto_captured",
    rule_hit: "within_rules",
    ai_reasoning: "Goal asked for printer paper. Recycled 500-sheet pack is the cheapest match at $9.00, well under the $50 auto-approve limit.",
    paypal_status: "COMPLETED",
  },
  {
    productId: "off-3",
    hoursAgo: 49,
    verdict: "voided",
    rule_hit: "auto_approve_limit",
    ai_reasoning: "User mentioned back pain while working. Suggested an ergonomic chair, but at $189 it needed approval. User denied, so the authorization was voided.",
    paypal_status: "VOIDED",
  },
  {
    productId: "pet-1",
    hoursAgo: 30,
    verdict: "auto_captured",
    rule_hit: "within_rules",
    ai_reasoning: "Weekly dog food restock. Same 5 kg bag as last time, $38.00, inside every rule.",
    paypal_status: "COMPLETED",
  },
  {
    productId: "pet-3",
    hoursAgo: 29,
    verdict: "approved",
    rule_hit: "auto_approve_limit",
    ai_reasoning: "Old dog bed was described as worn out. $72.00 is over the auto-approve limit, so held. User approved on their phone and it was captured.",
    paypal_status: "COMPLETED",
  },
  {
    productId: "cof-7",
    hoursAgo: 26,
    verdict: "denied",
    rule_hit: "blocked_category",
    ai_reasoning: "User asked for a coffee present for a friend. Gift cards are a blocked category, so PayPal was never called; suggested beans instead.",
    paypal_status: null,
  },
  {
    productId: "kit-2",
    hoursAgo: 20,
    verdict: "refunded",
    rule_hit: "within_rules",
    ai_reasoning: "Bought reusable food wraps for $19.00 within rules. User said they already had some and refunded it from the control room.",
    paypal_status: "REFUNDED",
  },
  {
    productId: "kit-1",
    hoursAgo: 6,
    verdict: "failed",
    rule_hit: "within_rules",
    ai_reasoning: "Dish soap restock was within rules, but PayPal declined the payment method (INSTRUMENT_DECLINED). Told the user to update their wallet; nothing was charged.",
    paypal_status: "DECLINED",
    debug: true,
  },
];

export function seedDecisions(): Decision[] {
  const goalId = "seed-goal";
  return ROWS.map((row, i) => {
    const product = MOCK_CATALOG.find((p) => p.id === row.productId)!;
    const at = new Date(Date.now() - row.hoursAgo * 3600_000).toISOString();
    const paid = row.paypal_status !== null;
    const captured = ["COMPLETED", "REFUNDED"].includes(row.paypal_status ?? "");
    return {
      id: `seed-${i + 1}`,
      goal_id: goalId,
      product,
      price: product.price,
      currency: product.currency,
      merchant: product.merchant,
      verdict: row.verdict,
      rule_hit: row.rule_hit,
      ai_reasoning: row.ai_reasoning,
      paypal_order_id: paid ? `SEED${i + 1}ORDER0000000` : null,
      paypal_auth_id: paid ? `SEED${i + 1}AUTH00000000` : null,
      paypal_capture_id: captured ? `SEED${i + 1}CAPTURE00000` : null,
      paypal_status: row.paypal_status,
      paypal_debug_id: row.debug ? "f3a9c21d7b4e0" : null,
      created_at: at,
      updated_at: at,
    };
  });
}
