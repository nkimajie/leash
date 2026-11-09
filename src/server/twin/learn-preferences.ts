// The digital twin. Pure functions that turn your decisions into things the assistant
// remembers, and check new products against what it remembers.

import type { Decision, NewPreference, Preference, Product, YourReason } from "@/schemas";

export type YourAction = "approved" | "denied" | "refunded";

/**
 * What the twin should learn when you approve, deny or refund something.
 * If you said why ("too expensive", "wrong store"...), it learns that exact lesson.
 * Returns null when there is nothing useful to learn (e.g. payments to people).
 */
export function lessonFromYourDecision(
  decision: Decision,
  action: YourAction,
  why: YourReason = {},
): NewPreference | null {
  if (decision.kind !== "purchase" || !decision.product) return null;
  const price = formatMoney(decision.amount);
  const { title, category, merchant, id: productId } = decision.product;
  const learned = { source: "learned" as const, learnedFromDecisionId: decision.id };
  const inYourWords = why.note ? ` You said: "${why.note}"` : "";

  if (action !== "approved" && why.reason) {
    switch (why.reason) {
      case "too_expensive":
        return {
          ...learned,
          sentiment: "avoids",
          statement: `"${title}" was too expensive at ${price}, so skips ${category} at that price or more.${inYourWords}`,
          category,
          priceAtLeast: decision.amount,
        };
      case "wrong_store":
        return {
          ...learned,
          sentiment: "avoids",
          statement: `Doesn't want to buy from ${merchant}.${inYourWords}`,
          merchant,
        };
      case "not_needed":
      case "not_my_taste":
        return {
          ...learned,
          sentiment: "avoids",
          statement: `${why.reason === "not_needed" ? "Didn't need" : "Didn't like"} "${title}". Don't buy it again.${inYourWords}`,
          productId,
        };
    }
  }

  switch (action) {
    case "denied":
      return {
        sentiment: "avoids",
        statement: `Said no to "${title}" at ${price}, so skips ${category} at that price or more.`,
        category,
        priceAtLeast: decision.amount,
        source: "learned",
        learnedFromDecisionId: decision.id,
      };
    case "refunded":
      return {
        sentiment: "avoids",
        statement: `Refunded "${title}". Don't buy it again.`,
        productId,
        source: "learned",
        learnedFromDecisionId: decision.id,
      };
    case "approved":
      return {
        sentiment: "likes",
        statement: `Happy to pay ${price} for ${category} from ${merchant}.`,
        category,
        merchant,
        source: "learned",
        learnedFromDecisionId: decision.id,
      };
  }
}

/** The first thing you've said you avoid that applies to this product, if any. */
export function findReasonToAvoid(product: Product, preferences: Preference[]): Preference | null {
  return preferences.find((p) => p.sentiment === "avoids" && appliesTo(p, product)) ?? null;
}

/** The first thing you've said you like that applies to this product, if any. */
export function findReasonToLike(product: Product, preferences: Preference[]): Preference | null {
  return preferences.find((p) => p.sentiment === "likes" && appliesTo(p, product)) ?? null;
}

function appliesTo(preference: Preference, product: Product): boolean {
  const hasMatcher = preference.category || preference.merchant || preference.productId;
  if (!hasMatcher) return false; // a free-text preference; only the AI model can apply it
  if (preference.productId && preference.productId !== product.id) return false;
  if (preference.category && !sameText(preference.category, product.category)) return false;
  if (preference.merchant && !sameText(preference.merchant, product.merchant)) return false;
  if (preference.priceAtLeast !== null && product.price < preference.priceAtLeast) return false;
  return true;
}

/** "Coffee Grinders" and "coffee grinder" are the same thing: ignore case, spacing and plurals. */
const sameText = (a: string, b: string) => normalize(a) === normalize(b);
const normalize = (text: string) =>
  text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.replace(/s$/, ""))
    .join(" ");
const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
