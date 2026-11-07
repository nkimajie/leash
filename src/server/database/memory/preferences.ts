import "server-only";

import type { NewPreference, Preference } from "@/schemas";
import { NewPreferenceSchema } from "@/schemas";
import { memoryTables, newId, timestampNow } from "./store";

export async function listPreferences(): Promise<Preference[]> {
  return [...memoryTables.preferences].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addPreference(details: NewPreference): Promise<Preference> {
  const preference: Preference = { ...NewPreferenceSchema.parse(details), id: newId(), createdAt: timestampNow() };
  memoryTables.preferences.push(preference);
  return preference;
}

export async function removePreference(id: string): Promise<boolean> {
  const before = memoryTables.preferences.length;
  memoryTables.preferences = memoryTables.preferences.filter((p) => p.id !== id);
  return memoryTables.preferences.length < before;
}
