import "server-only";

import type { NewPayee, Payee, PayeeChanges } from "@/schemas";
import { NewPayeeSchema } from "@/schemas";
import { memoryTables, newId, timestampNow } from "./memory-store";

// TODO(step 6): Supabase `payees` table.

export async function listPayees(): Promise<Payee[]> {
  return [...memoryTables.payees].sort((a, b) => a.name.localeCompare(b.name));
}

export async function findPayeeById(id: string): Promise<Payee | null> {
  return memoryTables.payees.find((p) => p.id === id) ?? null;
}

/** Matches "Sam" to "Sam Rivera" as well as exact names, ignoring case. */
export async function findPayeeByName(name: string): Promise<Payee | null> {
  const wanted = name.trim().toLowerCase();
  return (
    memoryTables.payees.find((p) => p.name.toLowerCase() === wanted) ??
    memoryTables.payees.find((p) => p.name.toLowerCase().split(" ")[0] === wanted) ??
    null
  );
}

export async function addPayee(details: NewPayee): Promise<Payee> {
  const payee: Payee = { ...NewPayeeSchema.parse(details), id: newId(), createdAt: timestampNow() };
  memoryTables.payees.push(payee);
  return payee;
}

export async function updatePayee(id: string, changes: PayeeChanges): Promise<Payee | null> {
  const payee = memoryTables.payees.find((p) => p.id === id);
  if (!payee) return null;
  Object.assign(payee, changes);
  return payee;
}

export async function removePayee(id: string): Promise<boolean> {
  const before = memoryTables.payees.length;
  memoryTables.payees = memoryTables.payees.filter((p) => p.id !== id);
  return memoryTables.payees.length < before;
}
