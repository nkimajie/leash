import "server-only";

// When you say *why* you denied or refunded something in your own words ("I only want hand
// grinders"), Claude turns it into a precise preference for the twin. Without Claude, or if
// its answer doesn't fit, the twin falls back to the simple lesson from learn-preferences.ts.

import { z } from "zod";
import type { Decision, NewPreference, YourReason } from "@/schemas";
import { askClaudeFor } from "@/server/agent/ask-claude";
import { lessonFromYourDecision, type YourAction } from "./learn-preferences";

const LessonSchema = z.object({
  sentiment: z.enum(["likes", "avoids"]),
  /** One short sentence a person reads on the twin page. */
  statement: z.string(),
  /** Set only when the lesson is about a whole category; copy the product's category exactly. */
  category: z.string().nullable(),
  /** Set only when the lesson is about this store; copy the merchant exactly. */
  merchant: z.string().nullable(),
  /** True when the lesson is only about this exact product. */
  onlyThisProduct: z.boolean(),
  /** Set when price was the problem: avoid matching products at this price or higher. */
  priceAtLeast: z.number().nullable(),
});

const INSTRUCTIONS = `You are the memory of a personal shopping assistant. The user just said no to something it chose, and told you why.
Turn their reason into ONE preference the assistant will follow next time.
- statement: one short plain sentence starting with a verb, e.g. "Avoid electric grinders; prefers manual ones."
- Use matchers only when the reason clearly supports them: category or merchant (copied exactly from the item), onlyThisProduct, priceAtLeast.
- If the reason is about taste that no matcher can express, leave every matcher empty: the assistant reads the statement.`;

export async function lessonFromYourWords(
  decision: Decision,
  action: YourAction,
  why: YourReason,
): Promise<NewPreference | null> {
  const simpleLesson = lessonFromYourDecision(decision, action, why);
  if (!why.note) return simpleLesson;

  const answer = await askClaudeFor(LessonSchema, INSTRUCTIONS, describeWhatHappened(decision, action, why));
  const learned = { source: "learned" as const, learnedFromDecisionId: decision.id };
  if (!answer) {
    return simpleLesson ?? { ...learned, sentiment: "avoids", statement: `About "${decision.title}": ${why.note}` };
  }
  return {
    ...learned,
    sentiment: answer.sentiment,
    statement: answer.statement.slice(0, 240),
    category: answer.category || null,
    merchant: answer.merchant || null,
    productId: answer.onlyThisProduct ? (decision.product?.id ?? null) : null,
    priceAtLeast: answer.priceAtLeast && answer.priceAtLeast > 0 ? answer.priceAtLeast : null,
  };
}

function describeWhatHappened(decision: Decision, action: YourAction, why: YourReason): string {
  const item = decision.product
    ? `Product: "${decision.product.title}", category "${decision.product.category}", merchant "${decision.product.merchant}", $${decision.amount.toFixed(2)}`
    : `Payment: ${decision.title}, $${decision.amount.toFixed(2)}`;
  return [
    item,
    `The assistant's reason for choosing it: ${decision.aiReasoning}`,
    `The user ${action} it.`,
    why.reason && `Quick reason they picked: ${why.reason.replaceAll("_", " ")}`,
    `In their words: "${why.note}"`,
  ]
    .filter(Boolean)
    .join("\n");
}
