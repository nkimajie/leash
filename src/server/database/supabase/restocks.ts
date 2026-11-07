import "server-only";

import type { NewRestock, Restock, RestockChanges } from "@/schemas";
import { daysFromNow } from "../dates";
import { connectToSupabase, dataOrThrow, rowsOrThrow } from "./client";
import { fromRestock, toRestock } from "./rows";

export async function listRestocks(): Promise<Restock[]> {
  const db = await connectToSupabase();
  const rows = rowsOrThrow(await db.from("restocks").select("*").order("next_run_at"), "list restocks");
  return rows.map(toRestock);
}

export async function findRestockById(id: string): Promise<Restock | null> {
  const db = await connectToSupabase();
  const row = dataOrThrow(await db.from("restocks").select("*").eq("id", id).maybeSingle(), "find a restock");
  return row ? toRestock(row) : null;
}

/** Active restocks whose next run time has passed. */
export async function listDueRestocks(now = new Date()): Promise<Restock[]> {
  const db = await connectToSupabase();
  const rows = rowsOrThrow(
    await db.from("restocks").select("*").eq("active", true).lte("next_run_at", now.toISOString()),
    "list due restocks",
  );
  return rows.map(toRestock);
}

export async function addRestock(details: NewRestock): Promise<Restock> {
  const db = await connectToSupabase();
  const row = dataOrThrow(
    await db
      .from("restocks")
      .insert(fromRestock({ ...details, nextRunAt: daysFromNow(details.everyDays), active: true }))
      .select()
      .single(),
    "add a restock",
  );
  return toRestock(row);
}

export async function updateRestock(id: string, changes: RestockChanges): Promise<Restock | null> {
  const db = await connectToSupabase();
  const row = dataOrThrow(
    await db.from("restocks").update(fromRestock(changes)).eq("id", id).select().maybeSingle(),
    "update a restock",
  );
  return row ? toRestock(row) : null;
}

/** Records that a restock just ran and schedules the next run. */
export async function markRestockRan(id: string): Promise<void> {
  const restock = await findRestockById(id);
  if (!restock) return;
  const db = await connectToSupabase();
  dataOrThrow(
    await db
      .from("restocks")
      .update(fromRestock({ lastRunAt: new Date().toISOString(), nextRunAt: daysFromNow(restock.everyDays) }))
      .eq("id", id),
    "schedule the next restock",
  );
}

export async function removeRestock(id: string): Promise<boolean> {
  const db = await connectToSupabase();
  const rows = rowsOrThrow(await db.from("restocks").delete().eq("id", id).select("id"), "remove a restock");
  return rows.length > 0;
}
