import "server-only";

// The database section. Everything that reads or writes stored data goes through here,
// grouped by table, e.g. `database.decisions.listDecisions()`.
//
// There are two versions of every table with exactly the same functions:
//   memory/    no setup, resets on restart (used when Supabase keys are missing)
//   supabase/  the real Postgres database
// The `typeof memory` below makes TypeScript check that both versions match.

import { serviceModes } from "@/server/config/environment";
import * as memory from "./memory";
import * as supabase from "./supabase";

const database: typeof memory = serviceModes().database === "supabase" ? supabase : memory;

export const { assistantRequests, decisions, payees, preferences, restocks, spendingRules, wallets } = database;
