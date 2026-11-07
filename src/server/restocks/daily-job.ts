import "server-only";

// The daily job, started by a Render Cron Job calling /api/keepalive with the cron secret.

import { cronSecret } from "@/server/config/environment";
import * as database from "@/server/database";
import { UnauthorizedError } from "@/server/errors";
import { runDueRestocks } from "./restock-service";

export async function runDailyJob(authorizationHeader: string | null) {
  if (!cronSecret) throw new UnauthorizedError("Set CRON_SECRET to turn on the daily job.");
  if (authorizationHeader !== `Bearer ${cronSecret}`) throw new UnauthorizedError("Wrong cron secret.");

  await database.spendingRules.loadSpendingRules(); // a small read keeps the database awake
  const runs = await runDueRestocks();
  return {
    ok: true,
    restocksRun: runs.map((run) => ({
      prompt: run.restock.prompt,
      decisions: run.decisions.map((d) => `${d.title}: ${d.outcome}`),
    })),
  };
}
