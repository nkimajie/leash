import "server-only";

import type { NewRestock, Restock, RestockChanges } from "@/schemas";
import { memoryTables, newId, timestampNow } from "./store";
import { daysFromNow } from "../dates";

export async function listRestocks(): Promise<Restock[]> {
  return [...memoryTables.restocks].sort((a, b) => a.nextRunAt.localeCompare(b.nextRunAt));
}

export async function findRestockById(id: string): Promise<Restock | null> {
  return memoryTables.restocks.find((r) => r.id === id) ?? null;
}

/** Active restocks whose next run time has passed. */
export async function listDueRestocks(now = new Date()): Promise<Restock[]> {
  return memoryTables.restocks.filter((r) => r.active && new Date(r.nextRunAt) <= now);
}

export async function addRestock(details: NewRestock): Promise<Restock> {
  const restock: Restock = {
    ...details,
    id: newId(),
    nextRunAt: daysFromNow(details.everyDays),
    lastRunAt: null,
    active: true,
    createdAt: timestampNow(),
  };
  memoryTables.restocks.push(restock);
  return restock;
}

export async function updateRestock(id: string, changes: RestockChanges): Promise<Restock | null> {
  const restock = memoryTables.restocks.find((r) => r.id === id);
  if (!restock) return null;
  Object.assign(restock, changes);
  return restock;
}

/** Records that a restock just ran and schedules the next run. */
export async function markRestockRan(id: string): Promise<void> {
  const restock = memoryTables.restocks.find((r) => r.id === id);
  if (!restock) return;
  restock.lastRunAt = timestampNow();
  restock.nextRunAt = daysFromNow(restock.everyDays);
}

export async function removeRestock(id: string): Promise<boolean> {
  const before = memoryTables.restocks.length;
  memoryTables.restocks = memoryTables.restocks.filter((r) => r.id !== id);
  return memoryTables.restocks.length < before;
}
