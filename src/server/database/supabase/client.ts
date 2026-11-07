import "server-only";

// One shared connection to Supabase, using the service-role key (server only).
// The first time it connects to an empty database, it adds the sample data so every
// screen has something to show.

import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseSettings } from "@/server/config/environment";
import { addSampleDataIfEmpty } from "./sample-data";

let connection: Promise<SupabaseClient> | undefined;

export function connectToSupabase(): Promise<SupabaseClient> {
  connection ??= (async () => {
    const client = createClient(supabaseSettings.url, supabaseSettings.serviceRoleKey, {
      auth: { persistSession: false },
    });
    await addSampleDataIfEmpty(client);
    return client;
  })().catch((error) => {
    connection = undefined; // try again on the next call
    throw error;
  });
  return connection;
}

/** Returns the data from a Supabase call, or throws a readable error. */
export function dataOrThrow<T>(result: { data: T; error: PostgrestError | null }, action: string): T {
  if (result.error) throw new Error(`Database error while trying to ${action}: ${result.error.message}`);
  return result.data;
}

/** Like dataOrThrow, for calls that return a list of rows. */
export function rowsOrThrow<T>(result: { data: T[] | null; error: PostgrestError | null }, action: string): T[] {
  return dataOrThrow(result, action) ?? [];
}
