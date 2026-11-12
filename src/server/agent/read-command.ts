// The built-in way to understand questions and commands, used when Claude is off.
// Pure and keyword-based: "what can you do?", "what's waiting for me?", "what did I spend on coffee?",
// "what's my limit?", "deny the grinder, I only want hand grinders", "approve it", "open my money",
// "raise my limit to $600". A question or a "no" it doesn't understand is "unclear": it never spends.
// Anything else is a request to shop or pay someone, and returns null.

import type { LeashPage } from "@/schemas";

export type Command =
  | { kind: "what_can_you_do" }
  | { kind: "whats_waiting" }
  | { kind: "look_up_spending" }
  | { kind: "deny"; what: string; reason: string | null }
  | { kind: "approve" }
  | { kind: "my_limits" }
  | { kind: "my_balance" }
  | { kind: "unclear" }
  /** `change`: for limits, a rule change in words the Limits page understands, ready to confirm. */
  | { kind: "open_page"; page: LeashPage; change?: string };

const PAGE_WORDS: [RegExp, LeashPage][] = [
  [/money|payments|receipts|control ?room|dashboard|history/, "money"],
  [/leash|rules?|limits?/, "limits"],
  [/people|contacts/, "people"],
  [/twin|preferences/, "twin"],
  [/restocks?|schedules?/, "restocks"],
  [/connect|paypal/, "paypal"],
  [/ask|assistant|home/, "ask"],
];

export function readCommand(prompt: string): Command | null {
  const original = prompt.trim().replace(/[’]/g, "'");
  const text = original.toLowerCase();

  // Matched on what you said, not the lowercase copy, so your reason keeps its capitals for the twin.
  const deny = original.match(
    /^(?:please\s+)?(?:deny|reject|decline|cancel|say no to|no to|don'?t buy|do not buy)\s+(.+)$/i,
  );
  if (deny) {
    const [what, ...why] = deny[1].split(/,|;|\.\s|\s+(?:because|since|as)\s+/);
    return { kind: "deny", what: what.trim(), reason: why.join(" ").trim() || null };
  }
  if (
    /^(?:please\s+)?(?:approve|accept|confirm)\b|\b(?:can|could|would|will) you (?:please )?(?:approve|accept)\b/.test(
      text,
    )
  ) {
    return { kind: "approve" };
  }
  if (
    /\b(?:raise|increase|lift|lower|reduce|decrease|change|set|update)\b.*\b(?:limits?|caps?|budget|rules?)\b/.test(
      text,
    )
  ) {
    return { kind: "open_page", page: "limits", change: ruleChangeIn(text) };
  }
  if (/^(?:undo|refund|reverse|take back)\b/.test(text)) return { kind: "open_page", page: "money" };

  const goTo = text.match(
    /^(?:please\s+)?(?:open|go to|take me to|show(?: me)?|see|view|switch to)\s+(?:the\s+|my\s+)?(.+)$/,
  );
  const page = goTo && PAGE_WORDS.find(([words]) => new RegExp(`^(?:${words.source})\\b`).test(goTo[1]))?.[1];
  if (page) return { kind: "open_page", page };

  if (
    /\bwhat (?:can|could|do) (?:you|leash)\b.*\bdo\b|\bhow (?:can|could) you help\b|\bwho are you\b|\bwhat are you\b|\bhow does (?:this|leash|it) work\b|^help\b/.test(
      text,
    )
  ) {
    return { kind: "what_can_you_do" };
  }
  // Questions only: "restock my coffee, spend under $60" is still a shopping request.
  if (/\b(?:what(?:'s| is)|anything)\b.*\b(?:waiting|pending|on hold)\b|\bneeds? my (?:ok|approval)\b/.test(text)) {
    return { kind: "whats_waiting" };
  }
  if (/\bbalance\b|\bhow much (?:money )?(?:do i have|have i got)\b(?! left)/.test(text)) {
    return { kind: "my_balance" };
  }
  // Your limits before your spending: "how much can you spend?" is about the limit, not the past.
  if (
    /\bwhat(?:'s| is| are)? my (?:limits?|rules?|budget|caps?)\b|\bhow much (?:is |do i have )?left\b|\bhow much can (?:you|i|leash) spend\b/.test(
      text,
    )
  ) {
    return { kind: "my_limits" };
  }
  if (
    /\bhow much\b.*\b(?:spen[dt]|paid|pay|buy|bought)\b|\bwhat (?:did |have )?i (?:spen[dt]|buy|bought|pay|paid)\b/.test(
      text,
    )
  ) {
    return { kind: "look_up_spending" };
  }
  // A question or a "no" that isn't one of the above: never treat it as a shopping list.
  const asksToShop = /^(?:can|could|would|will) you (?:please )?(?:buy|get|order|find|restock|pay|send)\b/.test(text);
  const isQuestion =
    text.endsWith("?") ||
    /^(?:what|why|how|when|where|who|which|is|are|was|were|do|does|did|can|could|should|would|will)\b/.test(text);
  const saysNo = /^(?:no|nope|don'?t|do not|never|stop)\b/.test(text);
  if (saysNo || (isQuestion && !asksToShop)) return { kind: "unclear" };
  return null;
}

/**
 * "Raise my limit to $600" as a change the Limits page understands ("Never buy one item over $600").
 * Undefined when no amount was given: the page just opens.
 */
function ruleChangeIn(text: string): string | undefined {
  const amount = text.match(/\$\s?(\d+(?:\.\d+)?)/)?.[1];
  if (!amount) return undefined;
  if (/without asking|auto|approv/.test(text)) return `Ask me before anything over $${amount}`;
  if (/\b(?:daily|a day|per day)\b/.test(text)) return `$${amount} a day`;
  if (/\b(?:weekly|a week|per week)\b/.test(text)) return `$${amount} a week`;
  if (/\b(?:person|people|send)\b/.test(text)) return `Never send one person over $${amount}`;
  return `Never buy one item over $${amount}`;
}

/**
 * Which waiting item you mean: "the grinder" matches "Baratza Encore Grinder".
 * "it" or "that" means the only thing waiting, if there's just one.
 */
export function pickWaitingItem<Item extends { title: string }>(waiting: Item[], what: string): Item | null {
  const words = what
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !["the", "that", "this", "one", "for", "please"].includes(word))
    .map((word) => (word.length > 4 ? word.replace(/s$/, "") : word)); // "grinders" -> "grinder"
  if (words.length === 0) return waiting.length === 1 ? waiting[0] : null;
  const score = (item: Item) => words.filter((word) => item.title.toLowerCase().includes(word)).length;
  const best = [...waiting].sort((a, b) => score(b) - score(a))[0];
  return best && score(best) > 0 ? best : null;
}

/** A message that is only a yes: "yes", "ok", "yes please, do that", "go ahead!". */
const SAYS_YES =
  /^(?:(?:yes|yeah|yep|sure|ok(?:ay)?|please(?: do)?|do (?:it|that)|go ahead|open (?:it|them)|thanks?)[\s,.!]*)+$/i;

/**
 * A follow-up to Leash's last reply: "yes, do that" after "Want me to open your limits?" opens them.
 * Returns null unless you said yes to an offer to open a page.
 */
export function readFollowUp(prompt: string, lastReply: string | undefined): Command | null {
  if (!lastReply || !SAYS_YES.test(prompt.trim())) return null;
  const offer = lastReply.match(/open (?:your |the |my )?([a-z ]+?)(?: page| tab)?\?/i);
  const page = offer && PAGE_WORDS.find(([words]) => new RegExp(`^(?:${words.source})\\b`, "i").test(offer[1]))?.[1];
  return page ? { kind: "open_page", page } : null;
}
