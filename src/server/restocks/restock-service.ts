import "server-only";

// Recurring restocks: requests the assistant repeats on a schedule ("Restock dog food every
// 30 days"). A daily job runs the ones that are due. Each run is a normal assistant request
// marked as a restock, so the spending service holds anything it buys for your approval.

import type { Decision, Restock } from "@/schemas";
import { runAssistant } from "@/server/agent/run-assistant";
import * as database from "@/server/database";
import { NotFoundError } from "@/server/errors";

export type RestockRun = { restock: Restock; decisions: Decision[]; reply: string };

/** Runs one restock now, whether or not it's due, and schedules the next run. */
export async function runRestockNow(restockId: string): Promise<RestockRun> {
  const restock = await database.restocks.findRestockById(restockId);
  if (!restock) throw new NotFoundError("That restock doesn't exist.");

  const decisions: Decision[] = [];
  let reply = "";
  for await (const step of runAssistant(restock.prompt, "restock")) {
    if (step.type === "decision_made") decisions.push(step.decision);
    if (step.type === "reply") reply = step.text;
    if (step.type === "error") reply = step.message;
  }

  await database.restocks.markRestockRan(restock.id);
  return { restock: (await database.restocks.findRestockById(restock.id)) ?? restock, decisions, reply };
}

/** Runs every active restock whose time has come. Called by the daily job. */
export async function runDueRestocks(): Promise<RestockRun[]> {
  const due = await database.restocks.listDueRestocks();
  const runs: RestockRun[] = [];
  for (const restock of due) runs.push(await runRestockNow(restock.id)); // one at a time, so budgets add up correctly
  return runs;
}
