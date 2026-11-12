import "server-only";

// The money path. Every purchase, payment, approval, denial and refund goes through here,
// so the rules and PayPal are always applied the same way, whoever acts.
//
//   rules say "blocked"         -> save as blocked; PayPal is never called
//   rules say "needs_approval"  -> PayPal reserves the money -> held until you decide
//   rules say "allowed"         -> PayPal reserves, then takes the money -> auto_approved
//
// Paying a person: once the money is taken, PayPal Payouts sends it on to their PayPal email.
// Buying something: once the money is taken, the store ships it, and the tracking goes on the PayPal order.
// Scheduled restocks run while you're away, so anything they buy is held for your OK.

import {
  DAYS_TO_ANSWER,
  isSampleHistory,
  type AssistantRequest,
  type Decision,
  type NewDecision,
  type Payee,
  type PayPalRecord,
  type Product,
  type RuleCheck,
  type YourReason,
} from "@/schemas";
import * as database from "@/server/database";
import { planShipment } from "@/server/delivery/delivery";
import { BadRequestError, ConflictError, NotFoundError } from "@/server/errors";
import * as paypal from "@/server/payments/paypal";
import type { YourAction } from "@/server/twin/learn-preferences";
import { lessonFromYourWords } from "@/server/twin/understand-your-reason";
import { calculateSpendingSoFar, checkPayment, checkPurchase, holdForScheduledRestock } from "./check-spending-rules";

// ---------- checking without paying ----------

export async function checkPurchaseRules(request: AssistantRequest, product: Product): Promise<RuleCheck> {
  const { rules, soFar } = await loadRulesAndSpending(request);
  const check = checkPurchase(
    {
      title: product.title,
      amount: product.price,
      currency: product.currency,
      merchant: product.merchant,
      category: product.category,
      // An outside agent's request text is its own, not yours: there's nothing of yours to compare with.
      whatYouAskedFor: request.source === "agent" ? null : request.prompt,
    },
    rules,
    soFar,
  );
  return request.source === "restock" ? holdForScheduledRestock(check) : check;
}

export async function checkPaymentRules(request: AssistantRequest, payee: Payee, amount: number): Promise<RuleCheck> {
  const { rules, soFar } = await loadRulesAndSpending(request);
  const check = checkPayment(
    {
      personName: payee.name,
      amount,
      currency: rules.currency,
      personIsTrusted: payee.trusted,
      personHasEmail: Boolean(payee.email),
    },
    rules,
    soFar,
  );
  return request.source === "restock" ? holdForScheduledRestock(check) : check;
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

/** One purchase or payment, ready to decide: a held payment shows where the money would go now. */
export async function findDecisionToDecide(decisionId: string): Promise<Decision> {
  const decision = await database.decisions.findDecisionById(decisionId);
  if (!decision) throw new NotFoundError("We couldn't find that purchase or payment.");
  return withCurrentPayee(decision);
}

/** You said yes to a held purchase or payment: PayPal takes the reserved money. */
export async function approveHeldDecision(decisionId: string): Promise<Decision> {
  return oneAtATime(decisionId, async () => {
    const held = await findDecisionIn(decisionId, ["held"]);
    const decision = held.kind === "payment" ? await withLatestEmail(held) : held;
    let approved: Decision;
    try {
      const taken = await takeReservedMoney(decision, decision.paypal.authorizationId!);
      if (taken.failure)
        return database.decisions.updateDecision(decisionId, { ...taken.failure, paypal: taken.paypal });
      approved = await database.decisions.updateDecision(decisionId, {
        outcome: "approved",
        payee: decision.payee,
        paypal: taken.paypal,
      });
    } catch (error) {
      await paypal.voidAuthorization(decision.paypal.authorizationId!).catch(() => {});
      return database.decisions.updateDecision(decisionId, paymentFailure(error));
    }
    // Only once the money is safely taken: a lesson (or shipping) can never undo a payment.
    await rememberLesson(approved, "approved");
    return shipIt(approved);
  });
}

/**
 * You said no: PayPal releases the reserved money. You are never charged.
 * If you said why, the twin learns that exact lesson.
 */
export async function denyHeldDecision(decisionId: string, why: YourReason = {}): Promise<Decision> {
  return oneAtATime(decisionId, async () => {
    const decision = await findDecisionIn(decisionId, ["held"]);
    const result = await paypal.voidAuthorization(decision.paypal.authorizationId!);
    const denied = await database.decisions.updateDecision(decisionId, {
      outcome: "denied",
      paypal: { status: result.status },
    });
    await rememberLesson(denied, "denied", why);
    return denied;
  });
}

export async function refundDecision(decisionId: string, why: YourReason = {}): Promise<Decision> {
  return oneAtATime(decisionId, async () => {
    const decision = await findDecisionIn(decisionId, ["auto_approved", "approved"]);
    if (decision.kind === "payment") {
      throw new BadRequestError(`The money already went on to ${decision.counterparty}. Ask them to send it back.`);
    }
    const result = await paypal.refundCapture(decision.paypal.captureId!);
    const refunded = await database.decisions.updateDecision(decisionId, {
      outcome: "refunded",
      paypal: { status: result.status },
    });
    await rememberLesson(refunded, "refunded", why);
    return refunded;
  });
}

/**
 * Releases reservations nobody answered in DAYS_TO_ANSWER, so money is never stuck "reserved".
 * (PayPal keeps an authorization for PAYPAL_AUTHORIZATION_DAYS; a week is plenty for a yes or no.)
 * The twin learns nothing: you didn't say no, you just didn't answer.
 */
export async function releaseForgottenHolds(now = new Date()): Promise<Decision[]> {
  const cutoff = now.getTime() - DAYS_TO_ANSWER * 24 * 60 * 60 * 1000;
  return releaseHolds(
    (d) => new Date(d.createdAt).getTime() < cutoff,
    `Nobody answered for ${DAYS_TO_ANSWER} days, so the reserved money was released. Nothing was charged.`,
  );
}

/** Releases every reservation, e.g. before the public demo is reset, so none is left open at PayPal. */
export async function releaseAllHolds(): Promise<Decision[]> {
  return releaseHolds(() => true, "The demo was reset, so the reserved money was released. Nothing was charged.");
}

/**
 * One at a time, like a tap on Deny, so a release never races your Approve. Each is checked again
 * first, and only marked released once PayPal has really released it (otherwise the next run retries).
 */
async function releaseHolds(shouldRelease: (held: Decision) => boolean, explanation: string): Promise<Decision[]> {
  const held = (await database.decisions.listDecisions()).filter((d) => d.outcome === "held" && shouldRelease(d));
  const released = await Promise.all(
    held.map((decision) =>
      oneAtATime(decision.id, async () => {
        const current = await database.decisions.findDecisionById(decision.id);
        if (current?.outcome !== "held") return null; // you decided in the meantime
        try {
          const result = await paypal.voidAuthorization(current.paypal.authorizationId!);
          return await database.decisions.updateDecision(current.id, {
            outcome: "denied",
            ruleExplanation: explanation,
            paypal: { status: result.status },
          });
        } catch (error) {
          console.warn(`Couldn't release ${current.id} at PayPal; it stays reserved and is retried next time`, error);
          return null;
        }
      }),
    ),
  );
  return released.filter((decision): decision is Decision => decision !== null);
}

// ---------- internals ----------

type DecisionDetails = Omit<NewDecision, "outcome" | "ruleHit" | "ruleExplanation" | "paypal">;

const NO_PAYPAL_RECORD: PayPalRecord = {
  orderId: null,
  authorizationId: null,
  captureId: null,
  status: null,
  debugId: null,
  payoutId: null,
};

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
  let paid: Decision;
  try {
    const taken = await takeReservedMoney(details, authorization.authorizationId);
    paid = await database.decisions.saveNewDecision({
      ...record,
      ...(taken.failure ?? { outcome: "auto_approved" }),
      paypal: { ...reserved, ...taken.paypal },
    });
  } catch (error) {
    await paypal.voidAuthorization(authorization.authorizationId).catch(() => {});
    const failure = paymentFailure(error);
    return database.decisions.saveNewDecision({ ...record, ...failure, paypal: { ...reserved, ...failure.paypal } });
  }
  // Step 3: the money is taken, so the store ships it.
  return paid.outcome === "auto_approved" ? shipIt(paid) : paid;
}

/**
 * The store ships what you bought, to the address on your saved PayPal account, and the carrier and
 * tracking number go on the real PayPal order (Orders v2 tracking), so "where's my order?" has an
 * answer. The stores in this sandbox demo don't really ship, so Leash plays the store here.
 * The money is already taken, so a problem is logged, never thrown: shipping can't undo a payment.
 */
async function shipIt(decision: Decision): Promise<Decision> {
  const { orderId, captureId } = decision.paypal;
  if (decision.kind !== "purchase" || !orderId || !captureId) return decision;
  try {
    const shipment = planShipment(decision.id, new Date());
    const [shipTo, onPayPalOrder] = await Promise.all([
      paypal.findShippingAddress().catch(() => null),
      paypal.addTracking(orderId, captureId, shipment).then(
        () => true,
        (error) => {
          console.warn(`PayPal didn't take the tracking for ${decision.id}`, error);
          return false;
        },
      ),
    ]);
    return await database.decisions.updateDecision(decision.id, { shipping: { ...shipment, shipTo, onPayPalOrder } });
  } catch (error) {
    console.warn(`Couldn't ship ${decision.id}`, error);
    return decision;
  }
}

type TakenMoney = {
  paypal: Partial<PayPalRecord>;
  /** Set when the money was taken but couldn't be sent on to the person. */
  failure?: { outcome: "failed"; ruleHit: "payment_error"; ruleExplanation: string };
};

/**
 * Takes the reserved money. A payment to a person then goes straight on to their PayPal email
 * (PayPal Payouts). If PayPal refuses the payout, the money is refunded at once, so it never
 * sits with Leash, and if even the refund fails, the record says so. Capture errors are thrown.
 */
async function takeReservedMoney(
  details: Pick<NewDecision, "kind" | "amount" | "currency" | "title" | "payee">,
  authorizationId: string,
): Promise<TakenMoney> {
  const capture = await paypal.capturePayment(authorizationId);
  const taken = { captureId: capture.captureId, status: capture.status };
  if (details.kind !== "payment") return { paypal: taken };

  try {
    const payout = await paypal.sendToPerson({
      email: details.payee!.email!,
      amount: details.amount,
      currency: details.currency,
      note: details.title,
      reference: authorizationId, // one payout per reservation: PayPal refuses a second one
    });
    return { paypal: { ...taken, payoutId: payout.payoutId } };
  } catch (error) {
    if (!(error instanceof paypal.PayPalError)) throw error;
    const refund = await paypal.refundCapture(capture.captureId).catch(() => null);
    const notSent = `PayPal took the money but couldn't send it on to ${details.payee!.name} (${error.issue})`;
    return {
      paypal: { ...taken, status: refund ? "REFUNDED" : "REFUND_FAILED", debugId: error.debugId || null },
      failure: {
        outcome: "failed",
        ruleHit: "payment_error",
        ruleExplanation: refund
          ? `${notSent}, so it was refunded to you.`
          : `${notSent}, and the refund failed too. Refund capture ${capture.captureId} in PayPal.`,
      },
    };
  }
}

/** Decisions someone is approving, denying or refunding right now. */
const decisionsInProgress = new Set<string>();

/** A double tap on Approve must never move money twice, so each decision is handled one at a time. */
async function oneAtATime<T>(decisionId: string, work: () => Promise<T>): Promise<T> {
  if (decisionsInProgress.has(decisionId)) throw new ConflictError("This is already being handled.");
  decisionsInProgress.add(decisionId);
  try {
    return await work();
  } finally {
    decisionsInProgress.delete(decisionId);
  }
}

/** A held payment may have waited for you to add the person's PayPal email, so look it up again. */
async function withLatestEmail(decision: Decision): Promise<Decision> {
  const latest = await withCurrentPayee(decision);
  if (!latest.payee?.email) {
    throw new BadRequestError(`Add ${decision.counterparty}'s PayPal email in Your leash, under People, then approve.`);
  }
  return latest;
}

/** A held payment, with the person's PayPal email as it is now (it may have been added or changed since). */
async function withCurrentPayee(decision: Decision): Promise<Decision> {
  if (decision.outcome !== "held" || !decision.payee) return decision;
  const payee = await database.payees.findPayeeById(decision.payee.id);
  return { ...decision, payee: { ...decision.payee, email: payee?.email ?? decision.payee.email } };
}

/** Turns a PayPal error into the fields saved on a failed decision. Re-throws anything else. */
function paymentFailure(error: unknown) {
  if (!(error instanceof paypal.PayPalError)) throw error;
  const failed = { outcome: "failed" as const, paypal: { status: error.issue, debugId: error.debugId || null } };
  if (error.isDeclined) {
    return {
      ...failed,
      ruleHit: "payment_declined" as const,
      ruleExplanation: "PayPal declined the payment method (INSTRUMENT_DECLINED). Nothing was charged.",
      paypal: { ...failed.paypal, status: "DECLINED" },
    };
  }
  if (error.issue === "PAYPAL_NOT_CONNECTED") {
    return {
      ...failed,
      ruleHit: "paypal_not_connected" as const,
      ruleExplanation:
        "Your PayPal account isn't connected yet, so nothing was charged. Tap Continue with PayPal first.",
    };
  }
  return {
    ...failed,
    ruleHit: "payment_error" as const,
    ruleExplanation: `PayPal said ${error.issue}. ${error.plainEnglish} Nothing was charged.`,
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
  if (isSampleHistory(decision)) throw new BadRequestError("This is sample history. It was never sent to PayPal.");
  if (!allowedOutcomes.includes(decision.outcome)) {
    throw new ConflictError(`This was already ${decision.outcome.replace("_", " ")}.`);
  }
  return decision;
}

/**
 * Teaches the twin. By now the money is already handled, so a lesson that can't be saved is logged,
 * never thrown: it must not turn a finished approve, deny or refund into an error.
 */
async function rememberLesson(decision: Decision, action: YourAction, why: YourReason = {}) {
  try {
    const lesson = await lessonFromYourWords(decision, action, why);
    if (lesson) await database.preferences.addPreference({ ...lesson, statement: fitLesson(lesson.statement) });
  } catch (error) {
    console.warn(`Couldn't save what the twin learned from ${decision.id}`, error);
  }
}

/** Lessons are at most 240 characters; a long note is cut, not refused. */
const fitLesson = (statement: string) => (statement.length <= 240 ? statement : `${statement.slice(0, 239)}…`);
