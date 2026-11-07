import "server-only";

// "Ask the control room": turns a question like "what did I spend on coffee this week?" into
// a view of the AG Grid (filters + sorting). Claude reads the question; the browser applies the view,
// and the grid's total row then answers "how much".

import { GridViewSchema, type GridView } from "@/schemas";
import { askClaudeFor } from "./ask-claude";
import { readGridQuestion } from "./read-grid-question";

const INSTRUCTIONS = `You control a table of an AI assistant's purchases and payments. Turn the user's question into a table view.
Outcomes: auto_approved and approved = paid; held = waiting for the user (money reserved); denied = user said no; blocked = stopped by a rule before PayPal; refunded; failed = PayPal error.
kind: "purchase" for products, "payment" for money sent to people.
searchText: a single word or short phrase to match against item, person, store, category or reasoning (e.g. "coffee", "Sam"). Leave it null unless the question names something.
sinceDays: 1 for today, 7 for this week, 30 for this month.
summary: the view in a few plain words, e.g. "Paid coffee purchases this week".
Leave a field null when the question doesn't mention it.`;

export async function askControlRoom(question: string): Promise<GridView> {
  return (await askClaudeFor(GridViewSchema, INSTRUCTIONS, question)) ?? readGridQuestion(question);
}
