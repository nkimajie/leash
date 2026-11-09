import "server-only";

// Demo mode (DEMO_MODE=true) is for the public demo judges use. Everyone shares one account, so:
//   - anyone can put it back to the sample data, and the daily job does so every night
//   - it resets itself when the next person arrives after 20 quiet minutes
//   - every fresh demo starts with one real purchase waiting for approval, to try on your phone
// The connected PayPal account is kept, and can't be disconnected while demo mode is on.

import { isSampleHistory } from "@/schemas";
import { serviceModes } from "@/server/config/environment";
import * as database from "@/server/database";
import { BadRequestError } from "@/server/errors";
import { getPayPalConnection } from "@/server/payments/paypal-connection";
import { SAMPLE_CATALOG } from "@/server/products/sample-catalog";
import { buyProduct, releaseAllHolds } from "@/server/spending/spending-service";

const QUIET_MINUTES_BEFORE_RESET = 20;

export async function resetDemo(): Promise<void> {
  if (!serviceModes().demoMode) throw new BadRequestError("Resetting is only available in demo mode.");
  await releaseAllHolds(); // nothing stays reserved at PayPal
  await database.demoData.resetToSampleData();
  await startWithOnePurchaseWaiting();
}

/**
 * Called when someone starts the assistant. If nobody has done anything for a while,
 * the last visitor's changes (their twin's lessons, the daily cap they used) are cleared first.
 * Returns true when it reset.
 */
export async function resetDemoIfQuiet(now = new Date()): Promise<boolean> {
  if (!serviceModes().demoMode) return false;
  const lastActivity = (await database.decisions.listDecisions())
    .filter((d) => !isSampleHistory(d))
    .reduce((latest, d) => Math.max(latest, new Date(d.updatedAt).getTime()), 0);
  if (lastActivity === 0 || now.getTime() - lastActivity < QUIET_MINUTES_BEFORE_RESET * 60_000) return false;
  await resetDemo();
  return true;
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
