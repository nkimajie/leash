// The money path. Every purchase, approval, denial and refund goes through here, so the
// rule engine and PayPal are always used the same way, whether the agent or a human acts.
//
//   checkPolicy -> blocked         -> "denied"   (PayPal never called)
//               -> needs_approval  -> authorize -> "held"          (human decides)
//               -> auto_approve    -> authorize -> capture -> "auto_captured"

import * as paypal from "./paypal";
import { checkPolicy, spendContext } from "./policy";
import * as store from "./store";
import type { Decision, Goal, PolicyResult, Product } from "./types";

export type PurchaseResult = { decision: Decision; policy: PolicyResult };

export async function previewPolicy(goal: Goal, product: Product): Promise<PolicyResult> {
  const [rules, decisions] = await Promise.all([store.getRules(), store.listDecisions()]);
  return checkPolicy(product, rules, spendContext(decisions, goal.id, goal.budget));
}

export async function purchase(goal: Goal, product: Product, reasoning: string): Promise<PurchaseResult> {
  const policy = await previewPolicy(goal, product);
  const base = {
    goal_id: goal.id,
    product,
    price: product.price,
    currency: product.currency,
    merchant: product.merchant,
    rule_hit: policy.rule_hit,
    ai_reasoning: reasoning,
    paypal_order_id: null,
    paypal_auth_id: null,
    paypal_capture_id: null,
    paypal_status: null,
    paypal_debug_id: null,
  };

  if (policy.verdict === "blocked") {
    return { policy, decision: await store.insertDecision({ ...base, verdict: "denied" }) };
  }

  // Reserve the money first. Nothing is taken yet.
  let auth: paypal.Authorization;
  try {
    auth = await paypal.authorize(product);
  } catch (err) {
    return { policy, decision: await store.insertDecision({ ...base, ...failure(err) }) };
  }
  const authorized = {
    ...base,
    paypal_order_id: auth.orderId,
    paypal_auth_id: auth.authId,
    paypal_status: auth.status,
  };

  if (policy.verdict === "needs_approval") {
    return { policy, decision: await store.insertDecision({ ...authorized, verdict: "held" }) };
  }

  // Within every rule: take the money now.
  try {
    const cap = await paypal.capture(auth.authId);
    const decision = await store.insertDecision({
      ...authorized,
      verdict: "auto_captured",
      paypal_capture_id: cap.captureId,
      paypal_status: cap.status,
    });
    return { policy, decision };
  } catch (err) {
    await paypal.voidAuthorization(auth.authId).catch(() => {}); // release the hold
    return { policy, decision: await store.insertDecision({ ...authorized, ...failure(err) }) };
  }
}

// Human said yes on the approve page: capture the held authorization.
export async function approve(id: string): Promise<Decision> {
  const d = await requireDecision(id, ["held"]);
  try {
    const cap = await paypal.capture(d.paypal_auth_id!);
    return (await store.updateDecision(id, {
      verdict: "approved",
      paypal_capture_id: cap.captureId,
      paypal_status: cap.status,
    }))!;
  } catch (err) {
    await paypal.voidAuthorization(d.paypal_auth_id!).catch(() => {});
    return (await store.updateDecision(id, failure(err)))!;
  }
}

// Human said no: void the authorization. The money is never taken.
export async function deny(id: string): Promise<Decision> {
  const d = await requireDecision(id, ["held"]);
  const result = await paypal.voidAuthorization(d.paypal_auth_id!);
  return (await store.updateDecision(id, { verdict: "voided", paypal_status: result.status }))!;
}

export async function refund(id: string): Promise<Decision> {
  const d = await requireDecision(id, ["auto_captured", "approved"]);
  const result = await paypal.refund(d.paypal_capture_id!);
  return (await store.updateDecision(id, { verdict: "refunded", paypal_status: result.status }))!;
}

export class DecisionStateError extends Error {}

async function requireDecision(id: string, allowed: Decision["verdict"][]): Promise<Decision> {
  const d = await store.getDecision(id);
  if (!d) throw new DecisionStateError("Decision not found.");
  if (!allowed.includes(d.verdict)) {
    throw new DecisionStateError(`This purchase is already ${d.verdict.replace("_", " ")}.`);
  }
  return d;
}

function failure(err: unknown) {
  if (err instanceof paypal.PayPalError) {
    return {
      verdict: "failed" as const,
      paypal_status: err.issue === "INSTRUMENT_DECLINED" ? "DECLINED" : err.issue,
      paypal_debug_id: err.debugId,
      rule_hit: err.issue,
    };
  }
  throw err;
}
