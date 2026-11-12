import "server-only";

// Demo mode (DEMO_MODE=true) is for the public demo judges use. Everyone shares one account, so:
//   - anyone can put it back to the sample data, and the daily job does so every night
//   - it starts fresh when the next person arrives after 30 quiet minutes
//   - every fresh demo starts with one real purchase waiting for your approval
// A reset keeps the connected PayPal account. Anyone can sign out and sign in again with the sandbox
// test account shown on the sign-in screen.

import { isSampleHistory, type AssistantEvent } from "@/schemas";
import { serviceModes } from "@/server/config/environment";
import * as database from "@/server/database";
import { BadRequestError } from "@/server/errors";
import { getPayPalConnection } from "@/server/payments/paypal-connection";
import { SAMPLE_CATALOG } from "@/server/products/sample-catalog";
import { buyProduct, releaseAllHolds } from "@/server/spending/spending-service";

const QUIET_MINUTES_BEFORE_RESET = 30;

/** The reset that's running right now, if any: two visitors arriving together share it. */
let resetInProgress: Promise<void> | null = null;

export async function resetDemo(): Promise<void> {
  if (!serviceModes().demoMode) throw new BadRequestError("Resetting is only available in demo mode.");
  resetInProgress ??= startFresh().finally(() => (resetInProgress = null));
  return resetInProgress;
}

/**
 * Runs before the assistant or an attack starts. If nobody has done anything for a while,
 * the last visitor's changes (their twin's lessons, the caps they used) are cleared first.
 */
export async function* startFreshIfQuiet(now = new Date()): AsyncGenerator<AssistantEvent> {
  if (!serviceModes().demoMode) return;
  const lastActivity = (await database.decisions.listDecisions())
    .filter((d) => !isSampleHistory(d))
    .reduce((latest, d) => Math.max(latest, new Date(d.updatedAt).getTime()), 0);
  if (lastActivity === 0 || now.getTime() - lastActivity < QUIET_MINUTES_BEFORE_RESET * 60_000) return;

  yield { type: "thinking", text: "Fresh demo: clearing the last visitor's purchases and lessons first…" };
  await resetDemo();
}

async function startFresh() {
  await releaseAllHolds(); // nothing stays reserved at PayPal
  await database.demoData.resetToSampleData();
  await startWithOnePurchaseWaiting();
}

/** A real PayPal reservation (the $85 grinder), so a visitor can approve or deny it straight away. */
async function startWithOnePurchaseWaiting() {
  if (!(await getPayPalConnection()).connected) return;
  const grinder = SAMPLE_CATALOG.find((product) => product.id === "cof-4")!;
  const request = await database.assistantRequests.startAssistantRequest("Find me a better coffee grinder", 100, "you");
  await buyProduct(
    request,
    grinder,
    "You said your blade grinder makes uneven coffee. This conical burr grinder has 40 settings and grinds evenly.",
  );
  await database.assistantRequests.markAssistantRequest(request.id, "finished");
}
