// The built-in way to understand questions and commands, used when Claude is off.
// Pure and keyword-based: "what can you do?", "what's waiting for me?", "what did I spend on coffee?",
// "deny the grinder, I only want hand grinders", "approve it" and "open the control room".
// Anything else is a request to shop or pay someone, and returns null.

import type { LeashPage } from "@/schemas";

export type Command =
  | { kind: "what_can_you_do" }
  | { kind: "whats_waiting" }
  | { kind: "look_up_spending" }
  | { kind: "deny"; what: string; reason: string | null }
  | { kind: "approve" }
  | { kind: "open_page"; page: LeashPage };

const PAGE_WORDS: [RegExp, LeashPage][] = [
  [/control ?room|dashboard|history/, "control-room"],
  [/rules?|limits?/, "rules"],
  [/people|contacts/, "people"],
  [/twin|preferences/, "twin"],
  [/restocks?|schedules?/, "restocks"],
  [/connect|paypal/, "connect"],
  [/assistant|home/, "assistant"],
];

export function readCommand(prompt: string): Command | null {
  const original = prompt.trim().replace(/[’]/g, "'");
  const text = original.toLowerCase();

  // Matched on what you said, not the lowercase copy, so your reason keeps its capitals for the twin.
  const deny = original.match(/^(?:please\s+)?(?:deny|reject|decline|say no to)\s+(.+)$/i);
  if (deny) {
    const [what, ...why] = deny[1].split(/,|;|\.\s|\s+(?:because|since|as)\s+/);
    return { kind: "deny", what: what.trim(), reason: why.join(" ").trim() || null };
  }
  if (/^(?:please\s+)?(?:approve|accept|confirm)\b/.test(text)) return { kind: "approve" };

  const goTo = text.match(/^(?:please\s+)?(?:open|go to|take me to|show me|switch to)\s+(?:the\s+|my\s+)?(.+)$/);
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
  if (/\bhow much\b.*\b(?:spen[dt]|paid|pay)\b|\bwhat (?:did|have) i (?:spen[dt]|buy|bought|pay|paid)\b/.test(text)) {
    return { kind: "look_up_spending" };
  }
  return null;
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
