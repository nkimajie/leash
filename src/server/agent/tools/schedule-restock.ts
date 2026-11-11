import "server-only";

import { z } from "zod";
import { formatDaysAway } from "@/lib/format";
import { NewRestockSchema } from "@/schemas";
import * as database from "@/server/database";
import { defineTool } from "./define-tool";

export const scheduleRestockTool = defineTool({
  name: "schedule_restock",
  description:
    "Set up a recurring restock when the user wants something bought on a schedule, e.g. 'restock dog food every 30 days'. Nothing is bought now: Leash repeats the request every `everyDays` days, and anything a restock buys waits for the user's approval.",
  inputSchema: z.object({
    prompt: NewRestockSchema.shape.prompt.describe(
      "What to buy each time, in the user's words without the schedule, e.g. 'Restock dog food, under $40'",
    ),
    everyDays: NewRestockSchema.shape.everyDays.describe("How often, in days: weekly is 7, monthly is 30"),
  }),
  async run({ prompt, everyDays }, { request }) {
    // A restock repeats your request later; it must never set up more restocks by itself.
    if (request.source === "restock") return { summary: "A scheduled restock can't set up another schedule." };
    const restock = await database.restocks.addRestock({ prompt, everyDays });
    return {
      summary: `Scheduled "${restock.prompt}" every ${everyDays} days. The first run is ${formatDaysAway(restock.nextRunAt)}, and anything it buys waits for your OK.`,
      data: restock,
    };
  },
});
