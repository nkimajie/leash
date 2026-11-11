// Answers "what did I spend on coffee this week?" from the list of purchases and payments.
// Pure: no database or network calls, so it's easy to test. Sample history never counts.

import { isSampleHistory, type Decision, type DecisionKind } from "@/schemas";

export type SpendingQuestion = {
  /** A word to look for in the item, person, store or category, e.g. "coffee" or "Sam". */
  searchText: string | null;
  /** 1 = today, 7 = this week, 30 = this month, null = any time. */
  sinceDays: number | null;
  kind: DecisionKind | null;
};

export type SpendingSummary = {
  /** Money PayPal took: paid automatically or approved by you. */
  paid: number;
  /** Money PayPal reserved, waiting for you. */
  waiting: number;
  /** The newest few, with the store and the rule's reason, so "why was that blocked?" can be answered. */
  items: Pick<Decision, "id" | "title" | "counterparty" | "amount" | "outcome" | "ruleExplanation" | "createdAt">[];
  /** The answer in one or two plain sentences. */
  answer: string;
};

/** Enough to answer a question, without flooding the assistant. The totals always count everything. */
const MOST_ITEMS = 15;

export function summariseSpending(
  decisions: Decision[],
  question: SpendingQuestion,
  now: Date = new Date(),
): SpendingSummary {
  const since = startOfPeriod(question.sinceDays, now);
  const search = question.searchText?.trim().toLowerCase();
  const matching = decisions.filter(
    (d) =>
      !isSampleHistory(d) &&
      (!question.kind || d.kind === question.kind) &&
      (!since || new Date(d.createdAt) >= since) &&
      (!search || [d.title, d.counterparty, d.category ?? ""].some((text) => text.toLowerCase().includes(search))),
  );
  const total = (outcomes: Decision["outcome"][]) =>
    matching.filter((d) => outcomes.includes(d.outcome)).reduce((sum, d) => sum + d.amount, 0);
  const paid = total(["auto_approved", "approved"]);
  const waiting = total(["held"]);
  const paidCount = matching.filter((d) => d.outcome === "auto_approved" || d.outcome === "approved").length;

  // "on coffee today", "on Sam this week", "in total"
  const onWhat = [search && `on ${question.searchText!.trim()}`, periodInWords(question.sinceDays)]
    .filter(Boolean)
    .join(" ");
  const money = (amount: number) => `$${amount.toFixed(2)}`;
  const answer = [
    paid > 0
      ? `You've spent ${money(paid)} ${onWhat || "in total"} (${paidCount} ${paidCount === 1 ? "item" : "items"}).`
      : `You haven't spent anything ${onWhat || "yet"}.`,
    waiting > 0 && `Another ${money(waiting)} is reserved, waiting for your OK.`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    paid,
    waiting,
    items: [...matching]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, MOST_ITEMS)
      .map(({ id, title, counterparty, amount, outcome, ruleExplanation, createdAt }) => ({
        id,
        title,
        counterparty,
        amount,
        outcome,
        ruleExplanation,
        createdAt,
      })),
    answer,
  };
}

/** "Today" starts at midnight, like the daily cap; a week or a month counts back from now. */
function startOfPeriod(sinceDays: number | null, now: Date): Date | null {
  if (!sinceDays) return null;
  if (sinceDays === 1) {
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    return midnight;
  }
  return new Date(now.getTime() - sinceDays * 24 * 60 * 60 * 1000);
}

function periodInWords(sinceDays: number | null): string | null {
  if (sinceDays === 1) return "today";
  if (sinceDays === 7) return "this week";
  if (sinceDays === 30) return "this month";
  return sinceDays ? `in the last ${sinceDays} days` : null;
}
