// The money path with PayPal and the database replaced by stand-ins, to check what happens
// when PayPal fails halfway: money is never left stuck, and never moves twice.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Decision } from "@/schemas";
import { ConflictError } from "@/server/errors";
import { PayPalError } from "@/server/payments/paypal-error";
import { approveHeldDecision } from "./spending-service";

vi.mock("server-only", () => ({}));

const saved = vi.hoisted(() => new Map<string, Decision>());

vi.mock("@/server/database", () => ({
  decisions: {
    findDecisionById: async (id: string) => saved.get(id) ?? null,
    updateDecision: async (id: string, changes: Partial<Decision>) => {
      const updated = { ...saved.get(id)!, ...changes, paypal: { ...saved.get(id)!.paypal, ...changes.paypal } };
      saved.set(id, updated);
      return updated;
    },
  },
  payees: { findPayeeById: async () => null },
}));

vi.mock("@/server/payments/paypal", async () => ({
  PayPalError: (await import("@/server/payments/paypal-error")).PayPalError,
  capturePayment: vi.fn(),
  sendToPerson: vi.fn(),
  refundCapture: vi.fn(),
  voidAuthorization: vi.fn(),
}));

vi.mock("@/server/twin/understand-your-reason", () => ({ lessonFromYourWords: async () => null }));

const paypal = vi.mocked(await import("@/server/payments/paypal"));

/** A $30 payment to Jordan, reserved at PayPal and waiting for you. */
const heldPayment = (): Decision => ({
  id: "d1",
  requestId: "r1",
  kind: "payment",
  title: "Payment to Jordan: concert tickets",
  counterparty: "Jordan",
  category: null,
  amount: 30,
  currency: "USD",
  outcome: "held",
  ruleHit: "new_person",
  ruleExplanation: "Jordan isn't on your trusted list yet.",
  aiReasoning: "You asked me to pay Jordan back.",
  product: null,
  payee: { id: "payee-jordan", name: "Jordan", email: "jordan@example.com" },
  paypal: {
    orderId: "ORDER1",
    authorizationId: "AUTH1",
    captureId: null,
    status: "CREATED",
    debugId: null,
    payoutId: null,
  },
  createdAt: "2026-11-09T10:00:00Z",
  updatedAt: "2026-11-09T10:00:00Z",
});

beforeEach(() => {
  vi.resetAllMocks();
  saved.clear();
  saved.set("d1", heldPayment());
  paypal.capturePayment.mockResolvedValue({ captureId: "CAPTURE1", status: "COMPLETED" });
  paypal.sendToPerson.mockResolvedValue({ payoutId: "PAYOUT1", status: "PENDING" });
  paypal.refundCapture.mockResolvedValue({ refundId: "REFUND1", status: "REFUNDED" });
});

describe("approving a payment to a person", () => {
  it("takes the money, then sends it on with Payouts, once per reservation", async () => {
    const approved = await approveHeldDecision("d1");
    expect(approved.outcome).toBe("approved");
    expect(approved.paypal).toMatchObject({ captureId: "CAPTURE1", payoutId: "PAYOUT1" });
    expect(paypal.sendToPerson).toHaveBeenCalledWith(
      expect.objectContaining({ email: "jordan@example.com", amount: 30, reference: "AUTH1" }),
    );
  });

  it("refunds you at once when PayPal refuses the payout, and keeps the capture on record", async () => {
    paypal.sendToPerson.mockRejectedValue(new PayPalError("INSUFFICIENT_FUNDS", "debug1", "Not enough money."));
    const failed = await approveHeldDecision("d1");
    expect(paypal.refundCapture).toHaveBeenCalledWith("CAPTURE1");
    expect(failed.outcome).toBe("failed");
    expect(failed.paypal).toMatchObject({ captureId: "CAPTURE1", status: "REFUNDED", debugId: "debug1" });
    expect(failed.ruleExplanation).toContain("refunded to you");
  });

  it("says exactly where the money is if even the refund fails", async () => {
    paypal.sendToPerson.mockRejectedValue(new PayPalError("INSUFFICIENT_FUNDS", "debug1", "Not enough money."));
    paypal.refundCapture.mockRejectedValue(new PayPalError("PAYPAL_UNREACHABLE", "", "Down."));
    const failed = await approveHeldDecision("d1");
    expect(failed.paypal.status).toBe("REFUND_FAILED");
    expect(failed.ruleExplanation).toContain("Refund capture CAPTURE1");
  });

  it("moves the money only once when Approve is tapped twice", async () => {
    const results = await Promise.allSettled([approveHeldDecision("d1"), approveHeldDecision("d1")]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")?.reason).toBeInstanceOf(ConflictError);
    expect(paypal.capturePayment).toHaveBeenCalledTimes(1);
  });
});
