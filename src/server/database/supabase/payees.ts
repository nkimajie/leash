import "server-only";

import type { NewPayee, Payee, PayeeChanges } from "@/schemas";
import { NewPayeeSchema } from "@/schemas";
import { connectToSupabase, dataOrThrow, rowsOrThrow } from "./client";
import { toPayee } from "./rows";

export async function listPayees(): Promise<Payee[]> {
  const db = await connectToSupabase();
  const rows = rowsOrThrow(await db.from("payees").select("*").order("name"), "list people");
  return rows.map(toPayee);
}

export async function findPayeeById(id: string): Promise<Payee | null> {
  const db = await connectToSupabase();
  const row = dataOrThrow(await db.from("payees").select("*").eq("id", id).maybeSingle(), "find a person");
  return row ? toPayee(row) : null;
}

/** Matches "Sam" to "Sam Rivera" as well as exact names, ignoring case. */
export async function findPayeeByName(name: string): Promise<Payee | null> {
  const wanted = name.trim().toLowerCase();
  const people = await listPayees();
  return (
    people.find((p) => p.name.toLowerCase() === wanted) ??
    people.find((p) => p.name.toLowerCase().split(" ")[0] === wanted) ??
    null
  );
}

export async function addPayee(details: NewPayee): Promise<Payee> {
  const db = await connectToSupabase();
  const row = dataOrThrow(
    await db.from("payees").insert(NewPayeeSchema.parse(details)).select().single(),
    "add a person",
  );
  return toPayee(row);
}

export async function updatePayee(id: string, changes: PayeeChanges): Promise<Payee | null> {
  const db = await connectToSupabase();
  const row = dataOrThrow(
    await db.from("payees").update(changes).eq("id", id).select().maybeSingle(),
    "update a person",
  );
  return row ? toPayee(row) : null;
}

export async function removePayee(id: string): Promise<boolean> {
  const db = await connectToSupabase();
  const rows = rowsOrThrow(await db.from("payees").delete().eq("id", id).select("id"), "remove a person");
  return rows.length > 0;
}
