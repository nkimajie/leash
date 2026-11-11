import { z } from "zod";
import type { Decision } from "./decision";
import type { SearchResult } from "./product";
import type { RuleName } from "./spending-rules";

/** The pages the assistant can open for you ("open my limits"). */
export const LEASH_PAGES = ["ask", "money", "limits", "people", "restocks", "paypal", "twin"] as const;
export type LeashPage = (typeof LEASH_PAGES)[number];

/** Each page's address, and how Leash names it in a sentence ("Opening your limits."). */
export const LEASH_PAGE: Record<LeashPage, { path: string; label: string }> = {
  ask: { path: "/", label: "Ask" },
  money: { path: "/money", label: "your money" },
  limits: { path: "/leash", label: "your limits" },
  people: { path: "/leash/people", label: "the people you pay" },
  restocks: { path: "/leash/restocks", label: "your restocks" },
  paypal: { path: "/leash/paypal", label: "your PayPal" },
  twin: { path: "/twin", label: "your twin" },
};

/** Where you change the rule that held or blocked something. Only you can: Leash just takes you there. */
export const PAGE_FOR_RULE: Partial<Record<RuleName, LeashPage>> = {
  auto_approve_limit: "limits",
  request_budget: "limits",
  max_item_price: "limits",
  max_payment_per_person: "limits",
  daily_cap: "limits",
  weekly_cap: "limits",
  blocked_category: "limits",
  category_not_allowed: "limits",
  blocked_merchant: "limits",
  merchant_not_allowed: "limits",
  new_person: "people",
  no_paypal_email: "people",
  paypal_not_connected: "paypal",
};

/**
 * The page that would unblock this, if any. Something held only needs your Approve or Deny, so it
 * gets no nudge to loosen your rules; the exception is a payment still missing the person's PayPal
 * email. Blocked ones and a missing PayPal connection point to where you can change things.
 */
export function pageToFix(decision: { outcome: string; ruleHit: RuleName }): LeashPage | null {
  const page = PAGE_FOR_RULE[decision.ruleHit] ?? null;
  if (decision.outcome === "blocked" || decision.outcome === "failed") return page;
  if (decision.outcome === "held" && decision.ruleHit === "no_paypal_email") return page;
  return null;
}

/** One earlier exchange in the conversation, so a follow-up like "yes, do that" makes sense. */
export const EarlierTurnSchema = z.object({
  you: z.string().trim().min(1).max(500),
  leash: z.string().trim().min(1).max(2000),
});
export type EarlierTurn = z.infer<typeof EarlierTurnSchema>;

/** One message you send the assistant ("Restock my coffee, under $60"). */
export const AssistantRequestSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  budget: z.number(),
  status: z.enum(["working", "finished", "failed"]),
  /**
   * "you" typed it; "restock" means a schedule started it while you were away;
   * "agent" means an outside AI agent asked through the Leash API (/api/v1).
   */
  source: z.enum(["you", "restock", "agent"]),
  createdAt: z.string(),
});
export type AssistantRequest = z.infer<typeof AssistantRequestSchema>;

/**
 * Live steps streamed from the server to the assistant page, one JSON object per line.
 * The page renders each one as it arrives, so you can watch the assistant work.
 */
export type AssistantEvent =
  | { type: "request_started"; request: AssistantRequest }
  | { type: "thinking"; text: string }
  /** The scam message in a "Try to break the leash" attack. */
  | { type: "attack"; text: string }
  | { type: "tool_started"; tool: string; input: Record<string, unknown> }
  /** `products` is set after a search, so the page can show what was found. */
  | { type: "tool_finished"; tool: string; summary: string; products?: SearchResult[] }
  | { type: "decision_made"; decision: Decision }
  /** You asked to go somewhere ("open the control room"); the page goes there once the reply is done. */
  | { type: "open_page"; path: string; label: string }
  | { type: "reply"; text: string }
  | { type: "error"; message: string }
  | { type: "finished" };
