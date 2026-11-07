// The built-in way to understand a control room question, used when Claude is off.
// Pure and keyword-based: it knows outcomes, "payments", amounts, "today/this week" and "biggest".

import type { GridView, Outcome } from "@/schemas";

const OUTCOME_WORDS: [RegExp, Outcome[], string][] = [
  [/\b(held|waiting|pending|reserved)\b/i, ["held"], "waiting for you"],
  [/\bblocked\b/i, ["blocked"], "blocked"],
  [/\bdenied\b/i, ["denied"], "denied"],
  [/\brefund/i, ["refunded"], "refunded"],
  [/\b(failed|declined|errors?)\b/i, ["failed"], "failed"],
  [/\b(stopped)\b/i, ["blocked", "denied"], "stopped"],
  [/\b(paid|spent|spend|bought)\b/i, ["auto_approved", "approved"], "paid"],
];

export function readGridQuestion(question: string): GridView {
  const text = question.toLowerCase();
  const outcomeMatch = OUTCOME_WORDS.find(([pattern]) => pattern.test(text));
  const kind = /\b(payments?|people|person|sent|send)\b/.test(text)
    ? ("payment" as const)
    : /\b(purchases?|products?|shopping)\b/.test(text)
      ? ("purchase" as const)
      : null;
  const over = text.match(/(?:over|above|more than|at least)\s*\$\s?(\d+(?:\.\d+)?)/);
  const under = text.match(/(?:under|below|less than|at most)\s*\$\s?(\d+(?:\.\d+)?)/);
  const sinceDays = /\btoday\b/.test(text) ? 1 : /\b(this|last) week\b/.test(text) ? 7 : null;
  const biggest = /\b(biggest|largest|most expensive|highest)\b/.test(text);
  const smallest = /\b(smallest|cheapest|lowest)\b/.test(text);
  const searchText = text.match(
    /\b(?:for|on|about)\s+([a-z][a-z -]{2,30}?)(?:\s+(?:over|under|today|this|last|biggest)|[?.!]?$)/,
  )?.[1];

  const understoodSomething = outcomeMatch || kind || over || under || sinceDays || biggest || smallest;
  const isJustAName = !understoodSomething && !searchText && text.trim().split(/\s+/).length <= 3;

  const view: GridView = {
    outcomes: outcomeMatch?.[1] ?? null,
    kind,
    minAmount: over ? Number(over[1]) : null,
    maxAmount: under ? Number(under[1]) : null,
    searchText: isJustAName
      ? question.trim()
      : searchText && !/^(me|you|my|it|the)$/.test(searchText.trim())
        ? searchText.trim()
        : null,
    sinceDays,
    sortBy: biggest || smallest ? "amount" : null,
    sortDirection: biggest ? "desc" : smallest ? "asc" : null,
    summary: "",
  };
  return { ...view, summary: describeView(view, outcomeMatch?.[2]) };
}

function describeView(view: GridView, outcomeWord?: string): string {
  const parts = [
    outcomeWord ? capitalise(outcomeWord) : "All",
    view.kind === "payment" ? "payments to people" : view.kind === "purchase" ? "purchases" : "items",
    view.searchText && `matching "${view.searchText}"`,
    view.minAmount !== null && `over $${view.minAmount}`,
    view.maxAmount !== null && `under $${view.maxAmount}`,
    view.sinceDays === 1 ? "today" : view.sinceDays === 7 ? "this week" : null,
    view.sortDirection === "desc" ? "biggest first" : view.sortDirection === "asc" ? "smallest first" : null,
  ];
  return parts.filter(Boolean).join(" ");
}

const capitalise = (word: string) => word[0].toUpperCase() + word.slice(1);
