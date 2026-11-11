// The last few exchanges with Leash, kept for this browser tab, so they survive opening another page:
// "open my limits", change one, come back, "ok, buy it now" still makes sense.

import { EarlierTurnSchema, type EarlierTurn } from "@/schemas";

const KEY = "leash-conversation";
const KEEP = 3;

export function loadConversation(): EarlierTurn[] {
  try {
    const saved = EarlierTurnSchema.array().safeParse(JSON.parse(sessionStorage.getItem(KEY) ?? "[]"));
    return saved.success ? saved.data.slice(-KEEP) : [];
  } catch {
    return []; // on the server, or storage is blocked
  }
}

/** Adds an exchange and keeps only the last few. */
export function rememberExchange(turns: EarlierTurn[], you: string, leash: string): EarlierTurn[] {
  const next = [...turns, { you: you.trim().slice(0, 500), leash: leash.trim().slice(0, 2000) }].slice(-KEEP);
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage is blocked: the conversation still works until you leave the page.
  }
  return next;
}
