import "server-only";

import { z } from "zod";
import * as database from "@/server/database";
import { summariseSpending } from "@/server/spending/summarise-spending";
import { defineTool } from "./define-tool";

export const lookUpSpendingTool = defineTool({
  name: "look_up_spending",
  description:
    "Add up what the user has spent, and what is waiting for them, e.g. for 'what did I spend on coffee this week?'. Answer from its result; never guess amounts. It changes nothing.",
  inputSchema: z.object({
    searchText: z
      .string()
      .nullable()
      .describe("One word or short phrase to look for in the item, person, store or category, e.g. 'coffee' or 'Sam'"),
    sinceDays: z.number().int().positive().nullable().describe("1 for today, 7 for this week, 30 for this month"),
    kind: z
      .enum(["purchase", "payment"])
      .nullable()
      .describe("purchase for products, payment for money sent to people"),
  }),
  async run(question) {
    const summary = summariseSpending(await database.decisions.listDecisions(), question);
    return { summary: summary.answer, data: summary };
  },
});
