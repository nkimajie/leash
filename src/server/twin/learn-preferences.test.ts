import { describe, expect, it } from "vitest";
import { NewPreferenceSchema, type Decision, type Preference, type Product } from "@/schemas";
import { findReasonToAvoid, findReasonToLike, lessonFromYourDecision } from "./learn-preferences";

const grinder: Product = {
  id: "cof-4",
  title: "Conical burr coffee grinder",
  price: 85,
  currency: "USD",
  merchant: "Kitchen Depot",
  category: "coffee equipment",
  source: "sample",
};

const decisionFor = (product: Product): Decision => ({
  id: "d1",
  requestId: "r1",
  kind: "purchase",
  title: product.title,
  counterparty: product.merchant,
  category: product.category,
  amount: product.price,
  currency: "USD",
  outcome: "held",
  ruleHit: "auto_approve_limit",
  ruleExplanation: "",
  aiReasoning: "",
  product,
  payee: null,
  paypal: { orderId: null, authorizationId: null, captureId: null, status: null, debugId: null, payoutId: null },
  createdAt: "",
  updatedAt: "",
});

const asSaved = (lesson: ReturnType<typeof lessonFromYourDecision>): Preference => ({
  ...NewPreferenceSchema.parse(lesson),
  id: "p1",
  createdAt: "",
});

describe("the twin learns from your decisions", () => {
  it("after you deny the $85 grinder, it avoids coffee equipment at $85 or more", () => {
    const learned = asSaved(lessonFromYourDecision(decisionFor(grinder), "denied"));
    expect(learned).toMatchObject({
      sentiment: "avoids",
      category: "coffee equipment",
      priceAtLeast: 85,
      source: "learned",
    });

    expect(findReasonToAvoid(grinder, [learned])).not.toBeNull();
    expect(findReasonToAvoid({ ...grinder, id: "x", price: 120 }, [learned])).not.toBeNull();
    expect(findReasonToAvoid({ ...grinder, id: "cheap", price: 34 }, [learned])).toBeNull();
  });

  it("after a refund, it avoids that exact product only", () => {
    const learned = asSaved(lessonFromYourDecision(decisionFor(grinder), "refunded"));
    expect(findReasonToAvoid(grinder, [learned])).not.toBeNull();
    expect(findReasonToAvoid({ ...grinder, id: "other" }, [learned])).toBeNull();
  });

  it("after you approve, it remembers you like that category from that merchant", () => {
    const learned = asSaved(lessonFromYourDecision(decisionFor(grinder), "approved"));
    expect(findReasonToLike(grinder, [learned])).not.toBeNull();
    expect(findReasonToLike({ ...grinder, merchant: "Elsewhere" }, [learned])).toBeNull();
  });

  it("learns nothing from payments to people", () => {
    expect(lessonFromYourDecision({ ...decisionFor(grinder), kind: "payment", product: null }, "denied")).toBeNull();
  });

  it("when you say 'wrong store', it avoids that store, whatever the product", () => {
    const learned = asSaved(lessonFromYourDecision(decisionFor(grinder), "denied", { reason: "wrong_store" }));
    expect(findReasonToAvoid({ ...grinder, id: "beans", price: 9, category: "coffee" }, [learned])).not.toBeNull();
    expect(findReasonToAvoid({ ...grinder, merchant: "Roastery Row" }, [learned])).toBeNull();
  });

  it("when you say 'didn't need it', it avoids only that product", () => {
    const learned = asSaved(lessonFromYourDecision(decisionFor(grinder), "denied", { reason: "not_needed" }));
    expect(findReasonToAvoid(grinder, [learned])).not.toBeNull();
    expect(findReasonToAvoid({ ...grinder, id: "other-grinder" }, [learned])).toBeNull();
  });

  it("keeps your own words in what it learned", () => {
    const lesson = lessonFromYourDecision(decisionFor(grinder), "denied", {
      reason: "too_expensive",
      note: "I only want hand grinders",
    });
    expect(lesson?.statement).toContain("I only want hand grinders");
  });

  it("matches categories however the store writes them", () => {
    const learned = asSaved(lessonFromYourDecision(decisionFor({ ...grinder, category: "Coffee Grinders" }), "denied"));
    expect(findReasonToAvoid({ ...grinder, category: "coffee grinder" }, [learned])).not.toBeNull();
  });

  it("ignores free-text preferences when matching products", () => {
    const freeText = asSaved({ sentiment: "avoids", statement: "Avoids single-use plastic" });
    expect(findReasonToAvoid(grinder, [freeText])).toBeNull();
  });
});
