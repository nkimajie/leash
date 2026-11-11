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

export type RestockSchedule = { prompt: string; everyDays: number };

const DAYS_PER: Record<string, number> = { day: 1, week: 7, fortnight: 14, month: 30, daily: 1, weekly: 7, fortnightly: 14, monthly: 30 };
const COUNT_WORDS: Record<string, number> = { a: 1, an: 1, one: 1, other: 2, two: 2, three: 3, four: 4, five: 5, six: 6 };

/**
 * "Restock dog food every 30 days" -> { prompt: "Restock dog food", everyDays: 30 }.
 * Also reads "every other week", "every two months", "weekly" and "monthly".
 * Returns null when the message doesn't ask for a schedule.
 */
export function readRestockSchedule(prompt: string): RestockSchedule | null {
  const match =
    prompt.match(/,?\s*\b(?:once\s+)?every\s+(?:(\d+|an?|one|other|two|three|four|five|six)\s+)?(day|week|fortnight|month)s?\b/i) ??
    prompt.match(/,?\s*\b(daily|weekly|fortnightly|monthly)\b/i);
  if (!match) return null;

  const [phrase, countOrUnit, unit] = match;
  const count = unit ? Number(countOrUnit ?? 1) || COUNT_WORDS[countOrUnit.toLowerCase()] : 1;
  const everyDays = count * DAYS_PER[(unit ?? countOrUnit).toLowerCase()];
  if (everyDays < 1 || everyDays > 365) return null;

  // What to buy each time: your words without the schedule. "Every month, restock paper" -> "Restock paper".
  const rest = prompt
    .replace(phrase, "")
    .replace(/^[\s,.;:-]*(?:please\s+)?/i, "")
    .replace(/[\s,.;:!-]+$/, "")
    .replace(/\s{2,}/g, " ");
  return rest.length < 3 ? null : { prompt: rest[0].toUpperCase() + rest.slice(1), everyDays };
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
