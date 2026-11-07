import "server-only";

import type { NewPreference, Preference } from "@/schemas";
import { NewPreferenceSchema } from "@/schemas";
import { connectToSupabase, dataOrThrow, rowsOrThrow } from "./client";
import { fromPreference, toPreference } from "./rows";

export async function listPreferences(): Promise<Preference[]> {
  const db = await connectToSupabase();
  const rows = rowsOrThrow(
    await db.from("preferences").select("*").order("created_at", { ascending: false }),
    "list preferences",
  );
  return rows.map(toPreference);
}

export async function addPreference(details: NewPreference): Promise<Preference> {
  const db = await connectToSupabase();
  const row = dataOrThrow(
    await db.from("preferences").insert(fromPreference(NewPreferenceSchema.parse(details))).select().single(),
    "save a preference",
  );
  return toPreference(row);
}

export async function removePreference(id: string): Promise<boolean> {
  const db = await connectToSupabase();
  const rows = rowsOrThrow(await db.from("preferences").delete().eq("id", id).select("id"), "forget a preference");
  return rows.length > 0;
}
