import "server-only";

import type { Decision, NewDecision } from "@/schemas";
import { memoryTables, newId, timestampNow } from "./memory-store";

// TODO(step 6): read and write the `decisions` table in Supabase when its keys are set.

export async function listDecisions(): Promise<Decision[]> {
  return [...memoryTables.decisions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function findDecisionById(id: string): Promise<Decision | null> {
  return memoryTables.decisions.find((decision) => decision.id === id) ?? null;
}

export async function saveNewDecision(details: NewDecision): Promise<Decision> {
  const decision: Decision = { ...details, id: newId(), createdAt: timestampNow(), updatedAt: timestampNow() };
  memoryTables.decisions.push(decision);
  return decision;
}

export async function updateDecision(
  id: string,
  changes: Partial<Omit<Decision, "paypal">> & { paypal?: Partial<Decision["paypal"]> },
): Promise<Decision> {
  const decision = memoryTables.decisions.find((d) => d.id === id);
  if (!decision) throw new Error(`Decision ${id} not found`);
  const { paypal, ...rest } = changes;
  Object.assign(decision, rest, { updatedAt: timestampNow() });
  if (paypal) decision.paypal = { ...decision.paypal, ...paypal };
  return decision;
}
