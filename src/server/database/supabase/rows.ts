import "server-only";

// Translates between database rows (snake_case) and the app's types (camelCase).

import type { AssistantRequest, Decision, Payee, Preference, Restock, Wallet } from "@/schemas";

/* eslint-disable @typescript-eslint/no-explicit-any -- rows come straight from the database */
type Row = Record<string, any>;

const numberOrNull = (value: unknown) => (value === null || value === undefined ? null : Number(value));

export const toPayee = (row: Row): Payee => ({
  id: row.id,
  name: row.name,
  email: row.email,
  note: row.note,
  trusted: row.trusted,
  createdAt: row.created_at,
});

export const toPreference = (row: Row): Preference => ({
  id: row.id,
  sentiment: row.sentiment,
  statement: row.statement,
  category: row.category,
  merchant: row.merchant,
  productId: row.product_id,
  priceAtLeast: numberOrNull(row.price_at_least),
  source: row.source,
  learnedFromDecisionId: row.learned_from_decision_id,
  createdAt: row.created_at,
});

export const fromPreference = (preference: Omit<Preference, "id" | "createdAt"> & Partial<Preference>): Row =>
  withoutUndefined({
  id: preference.id,
  sentiment: preference.sentiment,
  statement: preference.statement,
  category: preference.category,
  merchant: preference.merchant,
  product_id: preference.productId,
  price_at_least: preference.priceAtLeast,
  source: preference.source,
  learned_from_decision_id: preference.learnedFromDecisionId,
  created_at: preference.createdAt,
  });

export const toAssistantRequest = (row: Row): AssistantRequest => ({
  id: row.id,
  prompt: row.prompt,
  budget: Number(row.budget),
  status: row.status,
  source: row.source,
  createdAt: row.created_at,
});

export const toWallet = (row: Row): Wallet => ({
  id: row.id,
  vaultId: row.paypal_vault_id,
  payerEmail: row.payer_email,
  createdAt: row.created_at,
});

export const toRestock = (row: Row): Restock => ({
  id: row.id,
  prompt: row.prompt,
  everyDays: row.every_days,
  nextRunAt: row.next_run_at,
  lastRunAt: row.last_run_at,
  active: row.active,
  createdAt: row.created_at,
});

export const fromRestock = (restock: Partial<Restock>): Row =>
  withoutUndefined({
    id: restock.id,
    prompt: restock.prompt,
    every_days: restock.everyDays,
    next_run_at: restock.nextRunAt,
    last_run_at: restock.lastRunAt,
    active: restock.active,
    created_at: restock.createdAt,
  });

export const toDecision = (row: Row): Decision => ({
  id: row.id,
  requestId: row.request_id,
  kind: row.kind,
  title: row.title,
  counterparty: row.counterparty,
  category: row.category,
  amount: Number(row.amount),
  currency: row.currency,
  outcome: row.outcome,
  ruleHit: row.rule_hit,
  ruleExplanation: row.rule_explanation,
  aiReasoning: row.ai_reasoning,
  product: row.product,
  payee: row.payee,
  paypal: {
    orderId: row.paypal_order_id,
    authorizationId: row.paypal_authorization_id,
    captureId: row.paypal_capture_id,
    status: row.paypal_status,
    debugId: row.paypal_debug_id,
    payoutId: row.paypal_payout_id ?? null,
  },
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const fromDecision = (decision: Partial<Omit<Decision, "paypal">> & { paypal?: Partial<Decision["paypal"]> }) =>
  withoutUndefined({
    id: decision.id,
    request_id: decision.requestId,
    kind: decision.kind,
    title: decision.title,
    counterparty: decision.counterparty,
    category: decision.category,
    amount: decision.amount,
    currency: decision.currency,
    outcome: decision.outcome,
    rule_hit: decision.ruleHit,
    rule_explanation: decision.ruleExplanation,
    ai_reasoning: decision.aiReasoning,
    product: decision.product,
    payee: decision.payee,
    paypal_order_id: decision.paypal?.orderId,
    paypal_authorization_id: decision.paypal?.authorizationId,
    paypal_capture_id: decision.paypal?.captureId,
    paypal_status: decision.paypal?.status,
    paypal_debug_id: decision.paypal?.debugId,
    paypal_payout_id: decision.paypal?.payoutId,
    created_at: decision.createdAt,
    updated_at: decision.updatedAt,
  });

/** Drops fields that weren't given, so an update only changes what was asked. */
function withoutUndefined(row: Row): Row {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
}
