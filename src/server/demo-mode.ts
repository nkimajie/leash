import "server-only";

// Demo mode (DEMO_MODE=true) is for the public demo judges use. Everyone shares one account,
// so anyone can put it back to the sample data, and the daily job does so every night.
// The connected PayPal account is kept, and can't be disconnected while demo mode is on.

import { serviceModes } from "@/server/config/environment";
import * as database from "@/server/database";
import { BadRequestError } from "@/server/errors";

export async function resetDemo(): Promise<void> {
  if (!serviceModes().demoMode) throw new BadRequestError("Resetting is only available in demo mode.");
  await database.demoData.resetToSampleData();
}
