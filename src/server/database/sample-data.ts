import "server-only";

// Sample history so every screen has something to show on first run.
// It was never sent to PayPal, so it has no PayPal ids, and the app won't approve or refund it.

import {
  SAMPLE_HISTORY_REQUEST_ID,
  type Decision,
  type Outcome,
  type Payee,
  type Preference,
  type Restock,
  type RuleName,
} from "@/schemas";
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
      email: "jordan.lee@example.com",
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
      statement: 'Said no to "Ergonomic office chair, mesh back" at $189.00, so skips furniture at that price or more.',
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
    aiReasoning: "You mentioned back pain while working. This mesh-back chair is the best-reviewed one under $200.",
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
    aiReasoning: "You said the old dog bed was worn out. An orthopedic bed suits an older dog.",
    paypalStatus: "COMPLETED",
  },
  {
    productId: "cof-7",
    hoursAgo: 26,
    outcome: "blocked",
    ruleHit: "blocked_category",
    ruleExplanation: 'You blocked the category "gift cards".',
    aiReasoning: "You asked for a coffee present for a friend, and a café gift card seemed the easiest.",
    paypalStatus: null,
  },
  {
    productId: "kit-2",
    hoursAgo: 20,
    outcome: "refunded",
    ruleHit: "within_rules",
    ruleExplanation: "$19.00 is within every rule.",
    aiReasoning: "You asked for something to replace cling film. These wraps are reusable for a year.",
    paypalStatus: "REFUNDED",
  },
  {
    productId: "kit-1",
    hoursAgo: 6,
    outcome: "failed",
    ruleHit: "payment_declined",
    ruleExplanation: "PayPal declined the payment method (INSTRUMENT_DECLINED). Nothing was charged.",
    aiReasoning: "Dish soap restock: the 2 L refill is the cheapest per litre.",
    paypalStatus: "DECLINED",
  },
];

export function sampleDecisions(): Decision[] {
  const payees = samplePayees();
  return SAMPLE_ROWS.map((row, index) => {
    const product = row.productId ? SAMPLE_CATALOG.find((p) => p.id === row.productId)! : null;
    const payee = row.payeeId ? payees.find((p) => p.id === row.payeeId)! : null;
    const amount = product?.price ?? row.amount ?? 0;
    const at = hoursAgo(row.hoursAgo);
    return {
      id: `sample-${index + 1}`,
      requestId: SAMPLE_HISTORY_REQUEST_ID,
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
        orderId: null,
        authorizationId: null,
        captureId: null,
        status: row.paypalStatus,
        debugId: null,
        payoutId: null,
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
