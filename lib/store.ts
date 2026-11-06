// Data access. For now everything lives in memory (seeded with sample rows) so the app runs
// with zero keys. In step 6 these same functions switch to Supabase when its keys are set.
// Server-only: never import this from a client component.

import { DEFAULT_RULES } from "./policy";
import { seedDecisions } from "./seed";
import type { Decision, Goal, Rules } from "./types";

type Db = { rules: Rules; goals: Goal[]; decisions: Decision[] };

// Kept on globalThis so it survives hot reloads in development.
const g = globalThis as unknown as { __leashDb?: Db };
const db: Db = (g.__leashDb ??= {
  rules: DEFAULT_RULES,
  goals: [],
  decisions: seedDecisions(),
});

export async function getRules(): Promise<Rules> {
  return db.rules;
}

export async function saveRules(rules: Rules): Promise<Rules> {
  db.rules = rules;
  return rules;
}

export async function createGoal(prompt: string, budget: number): Promise<Goal> {
  const goal: Goal = { id: crypto.randomUUID(), prompt, budget, status: "running", created_at: now() };
  db.goals.unshift(goal);
  return goal;
}

export async function updateGoal(id: string, patch: Partial<Goal>): Promise<void> {
  const goal = db.goals.find((x) => x.id === id);
  if (goal) Object.assign(goal, patch);
}

export async function listDecisions(): Promise<Decision[]> {
  return [...db.decisions].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getDecision(id: string): Promise<Decision | null> {
  return db.decisions.find((d) => d.id === id) ?? null;
}

export async function insertDecision(
  row: Omit<Decision, "id" | "created_at" | "updated_at">,
): Promise<Decision> {
  const decision: Decision = { ...row, id: crypto.randomUUID(), created_at: now(), updated_at: now() };
  db.decisions.push(decision);
  return decision;
}

export async function updateDecision(id: string, patch: Partial<Decision>): Promise<Decision | null> {
  const decision = db.decisions.find((d) => d.id === id);
  if (!decision) return null;
  Object.assign(decision, patch, { updated_at: now() });
  return decision;
}

const now = () => new Date().toISOString();
