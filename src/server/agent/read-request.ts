// Small, pure helpers that pull facts out of what you typed or said.
// The Claude agent understands language itself; these are used to set the request budget
// and by the scripted mock assistant.

/** "under $60", "max $60", "budget of $60", "up to $60", "under 60 dollars" -> 60 */
export function readBudget(prompt: string): number | null {
  const match = withDollarSigns(prompt).match(
    /(?:under|below|max(?:imum)?|budget(?: of)?|up to)\s*\$\s?(\d+(?:\.\d{1,2})?)/i,
  );
  return match ? Number(match[1]) : null;
}

export type PaymentInstruction = { personName: string; amount: number; note: string };

/**
 * "Pay Sam $25 for dinner" or "Send $25 to Sam for dinner" -> { personName: "Sam", amount: 25, note: "dinner" }.
 * Returns null when the message isn't a payment to a person.
 */
export function readPaymentInstruction(prompt: string): PaymentInstruction | null {
  const text = withDollarSigns(prompt).trim();
  const nameFirst = text.match(
    /\b(?:pay|send)\s+([a-z][a-z'-]*(?:\s+(?!for\b|to\b)[a-z][a-z'-]*)?)\s+\$\s?(\d+(?:\.\d{1,2})?)(?:\s+(?:for|to cover)\s+(.+))?/i,
  );
  if (nameFirst) {
    return { personName: capitalise(nameFirst[1]), amount: Number(nameFirst[2]), note: cleanNote(nameFirst[3]) };
  }
  const amountFirst = text.match(
    /\b(?:pay|send)\s+\$\s?(\d+(?:\.\d{1,2})?)\s+to\s+([a-z][a-z'-]*(?:\s+(?!for\b|to\b)[a-z][a-z'-]*)?)(?:\s+(?:for|to cover)\s+(.+))?/i,
  );
  if (amountFirst) {
    return { personName: capitalise(amountFirst[2]), amount: Number(amountFirst[1]), note: cleanNote(amountFirst[3]) };
  }
  return null;
}

/** Speech recognition may write "25 dollars" or "25 bucks" instead of "$25". */
export function withDollarSigns(text: string): string {
  return text.replace(/\b(\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks|usd)\b/gi, "$$$1");
}

const capitalise = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

const cleanNote = (note: string | undefined) => (note ?? "").replace(/[.!]+$/, "").trim();
