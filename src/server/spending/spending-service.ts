import "server-only";

// The money path. Every purchase, payment, approval, denial and refund goes through here,
// so the rules and PayPal are always applied the same way, whoever acts.
//
//   rules say "blocked"         -> save as blocked; PayPal is never called
//   rules say "needs_approval"  -> PayPal reserves the money -> held until you decide
//   rules say "allowed"         -> PayPal reserves, then takes the money -> auto_approved

import type { AssistantRequest, Decision, NewDecision, Payee, Product, RuleCheck } from "@/schemas";
import * as database from "@/server/database";
import { ConflictError, NotFoundError } from "@/server/errors";
import * as paypal from "@/server/payments/paypal";
import { lessonFromYourDecision } from "@/server/twin/learn-preferences";
import { calculateSpendingSoFar, checkPayment, checkPurchase } from "./check-spending-rules";

// ---------- checking without paying ----------

export async function checkPurchaseRules(request: AssistantRequest, product: Product): Promise<RuleCheck> {
  const { rules, soFar } = await loadRulesAndSpending(request);
  return checkPurchase(
    {
      title: product.title,
      amount: product.price,
      currency: product.currency,
      merchant: product.merchant,
      category: product.category,
    },
    rules,
    soFar,
  );
}

export async function checkPaymentRules(request: AssistantRequest, payee: Payee, amount: number): Promise<RuleCheck> {
  const { rules, soFar } = await loadRulesAndSpending(request);
  return checkPayment(
    { personName: payee.name, amount, currency: rules.currency, personIsTrusted: payee.trusted },
    rules,
    soFar,
  );
}

// ---------- the assistant spending money ----------

export async function buyProduct(request: AssistantRequest, product: Product, aiReasoning: string): Promise<Decision> {
  const ruleCheck = await checkPurchaseRules(request, product);
  return payIfRulesAllow(ruleCheck, {
    requestId: request.id,
    kind: "purchase",
    title: product.title,
    counterparty: product.merchant,
    category: product.category,
    amount: product.price,
    currency: product.currency,
    aiReasoning,
    product,
    payee: null,
  });
}

export async function payPerson(
  request: AssistantRequest,
  payee: Payee,
  amount: number,
  note: string,
  aiReasoning: string,
): Promise<Decision> {
  const ruleCheck = await checkPaymentRules(request, payee, amount);
  const rules = await database.spendingRules.loadSpendingRules();
  return payIfRulesAllow(ruleCheck, {
    requestId: request.id,
    kind: "payment",
    title: note ? `Payment to ${payee.name}: ${note}` : `Payment to ${payee.name}`,
    counterparty: payee.name,
    category: null,
    amount,
    currency: rules.currency,
    aiReasoning,
    product: null,
    payee: { id: payee.id, name: payee.name, email: payee.email },
  });
}

// ---------- you deciding ----------

/** You said yes to a held purchase or payment: PayPal takes the reserved money. */
export async function approveHeldDecision(decisionId: string): Promise<Decision> {
  const decision = await findDecisionIn(decisionId, ["held"]);
  try {
    const capture = await paypal.capturePayment(decision.paypal.authorizationId!);
    const approved = await database.decisions.updateDecision(decisionId, {
      outcome: "approved",
      paypal: { captureId: capture.captureId, status: capture.status },
    });
    await rememberLesson(approved, "approved");
    return approved;
  } catch (error) {
    await paypal.voidAuthorization(decision.paypal.authorizationId!).catch(() => {});
    return database.decisions.updateDecision(decisionId, paymentFailure(error));
  }
}

/** You said no: PayPal releases the reserved money. You are never charged. */
export async function denyHeldDecision(decisionId: string): Promise<Decision> {
  const decision = await findDecisionIn(decisionId, ["held"]);
  const result = await paypal.voidAuthorization(decision.paypal.authorizationId!);
  const denied = await database.decisions.updateDecision(decisionId, {
    outcome: "denied",
    paypal: { status: result.status },
  });
  await rememberLesson(denied, "denied");
  return denied;
}

export async function refundDecision(decisionId: string): Promise<Decision> {
  const decision = await findDecisionIn(decisionId, ["auto_approved", "approved"]);
  const result = await paypal.refundCapture(decision.paypal.captureId!);
  const refunded = await database.decisions.updateDecision(decisionId, {
    outcome: "refunded",
    paypal: { status: result.status },
  });
  await rememberLesson(refunded, "refunded");
  return refunded;
}

// ---------- internals ----------

type DecisionDetails = Omit<NewDecision, "outcome" | "ruleHit" | "ruleExplanation" | "paypal">;

const NO_PAYPAL_RECORD = { orderId: null, authorizationId: null, captureId: null, status: null, debugId: null };

async function payIfRulesAllow(ruleCheck: RuleCheck, details: DecisionDetails): Promise<Decision> {
  const record = { ...details, ruleHit: ruleCheck.ruleHit, ruleExplanation: ruleCheck.explanation };

  if (ruleCheck.verdict === "blocked") {
    return database.decisions.saveNewDecision({ ...record, outcome: "blocked", paypal: NO_PAYPAL_RECORD });
  }

  // Step 1: reserve the money. Nothing is taken yet.
  let authorization: paypal.PaymentAuthorization;
  try {
    authorization = await paypal.authorizePayment({
      amount: details.amount,
      currency: details.currency,
      description: details.title,
      recipientEmail: details.payee?.email,
    });
  } catch (error) {
    const failure = paymentFailure(error);
    return database.decisions.saveNewDecision({
      ...record,
      ...failure,
      paypal: { ...NO_PAYPAL_RECORD, ...failure.paypal },
    });
  }
  const reserved = {
    ...NO_PAYPAL_RECORD,
    orderId: authorization.orderId,
    authorizationId: authorization.authorizationId,
    status: authorization.status,
  };

  if (ruleCheck.verdict === "needs_approval") {
    return database.decisions.saveNewDecision({ ...record, outcome: "held", paypal: reserved });
  }

  // Step 2: within every rule, so take the money now.
  try {
    const capture = await paypal.capturePayment(authorization.authorizationId);
    return database.decisions.saveNewDecision({
      ...record,
      outcome: "auto_approved",
      paypal: { ...reserved, captureId: capture.captureId, status: capture.status },
    });
  } catch (error) {
    await paypal.voidAuthorization(authorization.authorizationId).catch(() => {});
    const failure = paymentFailure(error);
    return database.decisions.saveNewDecision({ ...record, ...failure, paypal: { ...reserved, ...failure.paypal } });
  }
}

/** Turns a PayPal error into the fields saved on a failed decision. Re-throws anything else. */
function paymentFailure(error: unknown) {
  if (!(error instanceof paypal.PayPalError)) throw error;
  return {
    outcome: "failed" as const,
    ruleHit: error.isDeclined ? ("payment_declined" as const) : ("payment_error" as const),
    ruleExplanation: error.isDeclined
      ? "PayPal declined the payment method (INSTRUMENT_DECLINED). Nothing was charged."
      : `PayPal returned ${error.issue}. Nothing was charged.`,
    paypal: { status: error.isDeclined ? "DECLINED" : error.issue, debugId: error.debugId },
  };
}

async function loadRulesAndSpending(request: AssistantRequest) {
  const [rules, decisions] = await Promise.all([
    database.spendingRules.loadSpendingRules(),
    database.decisions.listDecisions(),
  ]);
  return { rules, soFar: calculateSpendingSoFar(decisions, request.id, request.budget) };
}

async function findDecisionIn(decisionId: string, allowedOutcomes: Decision["outcome"][]): Promise<Decision> {
  const decision = await database.decisions.findDecisionById(decisionId);
  if (!decision) throw new NotFoundError("We couldn't find that purchase or payment.");
  if (!allowedOutcomes.includes(decision.outcome)) {
    throw new ConflictError(`This was already ${decision.outcome.replace("_", " ")}.`);
  }
  return decision;
}

async function rememberLesson(decision: Decision, action: "approved" | "denied" | "refunded") {
  const lesson = lessonFromYourDecision(decision, action);
  if (lesson) await database.preferences.addPreference(lesson);
}
