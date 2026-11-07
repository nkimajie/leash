import "server-only";

// Sample history so every screen has something to show on first run.

import type { Decision, Outcome, Payee, Preference, Restock, RuleName } from "@/schemas";
import { SAMPLE_CATALOG } from "@/server/products/sample-catalog";

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

export function samplePayees(): Payee[] {
  return [
    {
      id: "payee-sam",
      name: "Sam Rivera",
      email: "sam.rivera@example.com",
      note: "Roommate",
      trusted: true,
      createdAt: hoursAgo(300),
    },
    {
      id: "payee-priya",
      name: "Priya Shah",
      email: "priya.shah@example.com",
      note: "Babysitter",
      trusted: true,
      createdAt: hoursAgo(300),
    },
    {
      id: "payee-jordan",
      name: "Jordan Lee",
      email: null,
      note: "Met at book club",
      trusted: false,
      createdAt: hoursAgo(80),
    },
  ];
}

export function samplePreferences(): Preference[] {
  const base = { merchant: null, productId: null, priceAtLeast: null, learnedFromDecisionId: null };
  return [
    {
      ...base,
      id: "pref-1",
      sentiment: "likes",
      statement: "Prefers fair-trade coffee",
      category: "coffee",
      source: "you",
      createdAt: hoursAgo(200),
    },
    {
      ...base,
      id: "pref-2",
      sentiment: "avoids",
      statement: "Avoids single-use plastic where possible",
      category: null,
      source: "you",
      createdAt: hoursAgo(190),
    },
    {
      ...base,
      id: "pref-3",
      sentiment: "avoids",
      statement: 'Said no to "Ergonomic office chair, mesh back" at $189.00. Avoid furniture at this price or higher.',
      category: "furniture",
      priceAtLeast: 189,
      source: "learned",
      learnedFromDecisionId: "sample-2",
      createdAt: hoursAgo(48),
    },
  ];
}

type SampleRow = {
  productId?: string;
  payeeId?: string;
  amount?: number;
  hoursAgo: number;
  outcome: Outcome;
  ruleHit: RuleName;
  ruleExplanation: string;
  aiReasoning: string;
  paypalStatus: string | null;
  debugId?: string;
};

const SAMPLE_ROWS: SampleRow[] = [
  {
    productId: "off-1",
    hoursAgo: 50,
    outcome: "auto_approved",
    ruleHit: "within_rules",
    ruleExplanation: "$9.00 is within every rule.",
    aiReasoning: "You asked for printer paper. The recycled 500-sheet pack is the cheapest match.",
    paypalStatus: "COMPLETED",
  },
  {
    productId: "off-3",
    hoursAgo: 49,
    outcome: "denied",
    ruleHit: "auto_approve_limit",
    ruleExplanation: "$189.00 is over your $50.00 auto-approve limit.",
    aiReasoning:
      "You mentioned back pain while working, so I suggested an ergonomic chair. You said no, so the hold was voided.",
    paypalStatus: "VOIDED",
  },
  {
    payeeId: "payee-priya",
    amount: 40,
    hoursAgo: 36,
    outcome: "auto_approved",
    ruleHit: "within_rules",
    ruleExplanation: "$40.00 to a trusted person is within every rule.",
    aiReasoning: "You asked me to pay Priya for Friday's babysitting.",
    paypalStatus: "COMPLETED",
  },
  {
    productId: "pet-1",
    hoursAgo: 30,
    outcome: "auto_approved",
    ruleHit: "within_rules",
    ruleExplanation: "$38.00 is within every rule.",
    aiReasoning: "Weekly dog food restock. Same 5 kg bag as last time.",
    paypalStatus: "COMPLETED",
  },
  {
    productId: "pet-3",
    hoursAgo: 29,
    outcome: "approved",
    ruleHit: "auto_approve_limit",
    ruleExplanation: "$72.00 is over your $50.00 auto-approve limit.",
    aiReasoning: "You said the old dog bed was worn out. Held for approval; you approved it on your phone.",
    paypalStatus: "COMPLETED",
  },
  {
    productId: "cof-7",
    hoursAgo: 26,
    outcome: "blocked",
    ruleHit: "blocked_category",
    ruleExplanation: 'You blocked the category "gift cards".',
    aiReasoning: "You asked for a coffee present for a friend. Gift cards are blocked, so PayPal was never called.",
    paypalStatus: null,
  },
  {
    productId: "kit-2",
    hoursAgo: 20,
    outcome: "refunded",
    ruleHit: "within_rules",
    ruleExplanation: "$19.00 is within every rule.",
    aiReasoning: "Bought reusable food wraps. You already had some and refunded them.",
    paypalStatus: "REFUNDED",
  },
  {
    productId: "kit-1",
    hoursAgo: 6,
    outcome: "failed",
    ruleHit: "payment_declined",
    ruleExplanation: "PayPal declined the payment method (INSTRUMENT_DECLINED).",
    aiReasoning: "Dish soap restock was within rules, but the payment was declined. Nothing was charged.",
    paypalStatus: "DECLINED",
    debugId: "f3a9c21d7b4e0",
  },
];

export function sampleDecisions(): Decision[] {
  const payees = samplePayees();
  return SAMPLE_ROWS.map((row, index) => {
    const product = row.productId ? SAMPLE_CATALOG.find((p) => p.id === row.productId)! : null;
    const payee = row.payeeId ? payees.find((p) => p.id === row.payeeId)! : null;
    const amount = product?.price ?? row.amount ?? 0;
    const reachedPayPal = row.paypalStatus !== null;
    const wasCaptured = row.paypalStatus === "COMPLETED" || row.paypalStatus === "REFUNDED";
    const at = hoursAgo(row.hoursAgo);
    return {
      id: `sample-${index + 1}`,
      requestId: "sample-request",
      kind: product ? "purchase" : "payment",
      title: product?.title ?? `Payment to ${payee!.name}`,
      counterparty: product?.merchant ?? payee!.name,
      category: product?.category ?? null,
      amount,
      currency: "USD",
      outcome: row.outcome,
      ruleHit: row.ruleHit,
      ruleExplanation: row.ruleExplanation,
      aiReasoning: row.aiReasoning,
      product,
      payee: payee ? { id: payee.id, name: payee.name, email: payee.email } : null,
      paypal: {
        orderId: reachedPayPal ? `SAMPLE${index + 1}ORDER00000` : null,
        authorizationId: reachedPayPal ? `SAMPLE${index + 1}AUTH000000` : null,
        captureId: wasCaptured ? `SAMPLE${index + 1}CAPTURE000` : null,
        status: row.paypalStatus,
        debugId: row.debugId ?? null,
      },
      createdAt: at,
      updatedAt: at,
    };
  });
}

export function sampleRestocks(): Restock[] {
  return [
    {
      id: "restock-dog-food",
      prompt: "Restock dog food",
      everyDays: 30,
      nextRunAt: hoursAgo(-24 * 4),
      lastRunAt: hoursAgo(24 * 26),
      active: true,
      createdAt: hoursAgo(24 * 60),
    },
    {
      id: "restock-coffee",
      prompt: "Restock fair-trade coffee beans, under $20",
      everyDays: 14,
      nextRunAt: hoursAgo(2),
      lastRunAt: hoursAgo(24 * 14 + 2),
      active: true,
      createdAt: hoursAgo(24 * 40),
    },
  ];
}
