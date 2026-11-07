import "server-only";

// The daily job, started by a Render Cron Job calling /api/keepalive with the cron secret.
// It keeps the database awake, runs restocks that are due, and releases reservations
// nobody answered in time.

import { cronSecret, serviceModes } from "@/server/config/environment";
import * as database from "@/server/database";
import { UnauthorizedError } from "@/server/errors";
import { releaseForgottenHolds } from "@/server/spending/spending-service";
import { runDueRestocks } from "./restock-service";

export async function runDailyJob(authorizationHeader: string | null) {
  if (!cronSecret) throw new UnauthorizedError("Set CRON_SECRET to turn on the daily job.");
  if (authorizationHeader !== `Bearer ${cronSecret}`) throw new UnauthorizedError("Wrong cron secret.");

  await database.spendingRules.loadSpendingRules(); // a small read keeps the database awake
  if (serviceModes().demoMode) await database.demoData.resetToSampleData(); // a fresh demo every morning
  const runs = await runDueRestocks();
  const released = await releaseForgottenHolds();
  return {
    ok: true,
    holdsReleased: released.map((d) => d.title),
    restocksRun: runs.map((run) => ({
      prompt: run.restock.prompt,
      decisions: run.decisions.map((d) => `${d.title}: ${d.outcome}`),
    })),
  };
}
