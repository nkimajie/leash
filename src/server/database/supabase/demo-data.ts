import "server-only";

// Demo mode: put every table back to the sample data. The saved PayPal account (wallets) is kept.

import { connectToSupabase } from "./client";
import { addSampleDataIfEmpty } from "./sample-data";

const TABLES_TO_EMPTY = ["decisions", "preferences", "payees", "restocks", "assistant_requests", "spending_rules"];

export async function resetToSampleData(): Promise<void> {
  const db = await connectToSupabase();
  for (const table of TABLES_TO_EMPTY) {
    const { error } = await db.from(table).delete().neq(table === "spending_rules" ? "user_id" : "id", "");
    if (error) throw new Error(`Couldn't empty ${table}: ${error.message}`);
  }
  await addSampleDataIfEmpty(db);
}
