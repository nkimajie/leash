// Leash's decisions as data for AG Studio: one flat row per decision. The amount is also split
// into one column per thing that can happen to the money, so a tile or a chart just adds up a column.

import type { AgDataSourcesDefinition, AgExpressionFieldDefinition, AgFieldDefinition } from "ag-studio";
import { isSampleHistory, type Decision, type Outcome } from "@/schemas";
import { OUTCOME_STYLE, RULE_LABEL } from "@/lib/labels";

export type DashboardRow = {
  id: string;
  /** When it happened (ISO date and time), for sorting the table. */
  when: string;
  /** The day it happened, in your time zone: "2026-11-10". */
  day: string;
  what: string;
  where: string;
  /** "Pet supplies", or "People" for payments to a person. */
  category: string;
  /** The stamp on the receipt: Paid, Reserved, Released, Blocked, Refunded or Failed. */
  stamp: string;
  rule: string;
  /** "Sample" for the history every account starts with (never sent to PayPal), "Yours" for the rest. */
  history: "Sample" | "Yours";
  amount: number;
  paid: number;
  reserved: number;
  /** Blocked by a rule, or released when you said no: stopped by your leash either way. */
  stopped: number;
  refunded: number;
};

const PAID: Outcome[] = ["auto_approved", "approved"];
const STOPPED: Outcome[] = ["blocked", "denied"];

export function toDashboardRow(decision: Decision): DashboardRow {
  const { amount, outcome } = decision;
  const category = decision.category ?? (decision.kind === "payment" ? "people" : "other");
  return {
    id: decision.id,
    when: decision.createdAt,
    day: localDay(decision.createdAt),
    what: decision.title,
    where: decision.counterparty,
    category: category.charAt(0).toUpperCase() + category.slice(1),
    stamp: OUTCOME_STYLE[outcome].label,
    rule: RULE_LABEL[decision.ruleHit],
    history: isSampleHistory(decision) ? "Sample" : "Yours",
    amount,
    paid: PAID.includes(outcome) ? amount : 0,
    reserved: outcome === "held" ? amount : 0,
    stopped: STOPPED.includes(outcome) ? amount : 0,
    refunded: outcome === "refunded" ? amount : 0,
  };
}

/** "2026-11-10" in the browser's time zone, so a payment made at 11pm lands on the right day. */
function localDay(isoDate: string): string {
  const date = new Date(isoDate);
  const twoDigits = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
}

const dollars = { format: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }) };
const money = (id: string, name: string, hide = false): AgFieldDefinition => ({
  id,
  name,
  format: "currencyFormat",
  formatOptions: dollars,
  hide,
});

// The names Studio shows for each column. The report refers to them as "decisions.<id>".
const FIELDS: AgFieldDefinition[] = [
  { id: "id", name: "Receipt", format: "textFormat", hide: true },
  {
    id: "when",
    name: "When",
    format: "dateTimeFormat",
    formatOptions: {
      format: new Intl.DateTimeFormat([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    },
  },
  {
    id: "day",
    name: "Day",
    format: "dateFormat",
    formatOptions: { format: new Intl.DateTimeFormat([], { weekday: "short", month: "short", day: "numeric" }) },
  },
  { id: "what", name: "What", format: "textFormat" },
  { id: "where", name: "Where", format: "textFormat" },
  { id: "category", name: "Category", format: "textFormat" },
  { id: "stamp", name: "What happened", format: "textFormat" },
  { id: "rule", name: "Rule", format: "textFormat" },
  { id: "history", name: "History", format: "textFormat" },
  // Studio adds these up through the measures below, so the editor lists them only once.
  money("amount", "Amount", true),
  money("paid", "Paid", true),
  money("reserved", "Waiting for you", true),
  money("stopped", "Stopped by your leash", true),
  money("refunded", "Refunded", true),
];

/** "paidTotal": a column's total with a plain name ("Paid", not "Paid (sum)") for tiles, legends and tooltips. */
const total = (column: string, name: string, description: string): AgExpressionFieldDefinition => ({
  id: `${column}Total`,
  name,
  description,
  format: "currencyFormat",
  formatOptions: dollars,
  isMeasure: true,
  expression: { id: `decisions.${column}`, aggregation: "sum" },
});

const MEASURES: AgExpressionFieldDefinition[] = [
  total("amount", "Amount", "What it cost, whatever happened to the money."),
  total("paid", "Paid", "Paid automatically within your rules, or after you said yes."),
  total("reserved", "Waiting", "Reserved at PayPal and waiting for your okay. Nothing is taken until you say yes."),
  total("stopped", "Stopped", "Blocked by a rule before PayPal was called, or released when you said no."),
  total("refunded", "Refunded", "Paid, then given back."),
];

export function dashboardData(rows: DashboardRow[]): AgDataSourcesDefinition {
  return {
    sources: [
      {
        id: "decisions",
        name: "Decisions",
        description: "Every purchase and payment your Leash assistant tried to make, and what happened to the money.",
        primaryKeyField: "id",
        data: rows,
        fields: FIELDS,
      },
    ],
    expressions: MEASURES,
  };
}
