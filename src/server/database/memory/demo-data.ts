import "server-only";

// Demo mode: put every table back to the sample data. The saved PayPal account is kept.

import { DEFAULT_SPENDING_RULES } from "@/schemas";
import { sampleDecisions, samplePayees, samplePreferences, sampleRestocks } from "../sample-data";
import { memoryTables } from "./store";

export async function resetToSampleData(): Promise<void> {
  Object.assign(memoryTables, {
    spendingRules: DEFAULT_SPENDING_RULES,
    payees: samplePayees(),
    preferences: samplePreferences(),
    assistantRequests: [],
    decisions: sampleDecisions(),
    restocks: sampleRestocks(),
  });
}
