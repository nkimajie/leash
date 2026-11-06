// The browser's way of talking to our API. Components call these readable functions
// instead of using fetch directly.

import type {
  AssistantEvent,
  Decision,
  NewPayee,
  NewPreference,
  Payee,
  PayeeChanges,
  Preference,
  ServiceModes,
  SpendingRules,
} from "@/schemas";

// ---------- decisions (purchases and payments) ----------

export const fetchDecisions = () => getJson<Decision[]>("/api/decisions");
export const fetchDecision = (id: string) => getJson<Decision>(`/api/decisions/${id}`);
export const approveDecision = (id: string) => sendJson<Decision>("POST", `/api/decisions/${id}/approve`);
export const denyDecision = (id: string) => sendJson<Decision>("POST", `/api/decisions/${id}/deny`);
export const refundDecision = (id: string) => sendJson<Decision>("POST", `/api/decisions/${id}/refund`);

// ---------- people ----------

export const fetchPayees = () => getJson<Payee[]>("/api/payees");
export const addPayee = (details: NewPayee) => sendJson<Payee>("POST", "/api/payees", details);
export const updatePayee = (id: string, changes: PayeeChanges) =>
  sendJson<Payee>("PATCH", `/api/payees/${id}`, changes);
export const removePayee = (id: string) => sendJson<void>("DELETE", `/api/payees/${id}`);

// ---------- digital twin ----------

export const fetchPreferences = () => getJson<Preference[]>("/api/preferences");
export const addPreference = (details: NewPreference) => sendJson<Preference>("POST", "/api/preferences", details);
export const removePreference = (id: string) => sendJson<void>("DELETE", `/api/preferences/${id}`);

// ---------- rules and status ----------

export const fetchSpendingRules = () => getJson<SpendingRules>("/api/rules");
export const saveSpendingRules = (rules: SpendingRules) => sendJson<SpendingRules>("PUT", "/api/rules", rules);
export const fetchServiceModes = () => getJson<ServiceModes>("/api/status");

// ---------- assistant ----------

/** Sends a request to the assistant and calls `onStep` for each step as it streams in. */
export async function askAssistant(prompt: string, onStep: (event: AssistantEvent) => void): Promise<void> {
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok || !response.body) throw new ApiError(await readErrorMessage(response));

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let unfinishedLine = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const lines = (unfinishedLine + value).split("\n");
    unfinishedLine = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) onStep(JSON.parse(line) as AssistantEvent);
  }
}

// ---------- plumbing ----------

export class ApiError extends Error {}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new ApiError(await readErrorMessage(response));
  return response.json();
}

async function sendJson<T>(method: "POST" | "PUT" | "PATCH" | "DELETE", url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new ApiError(await readErrorMessage(response));
  return response.status === 204 ? (undefined as T) : response.json();
}

async function readErrorMessage(response: Response) {
  const body = await response.json().catch(() => null);
  return body?.error ?? `Request failed (${response.status}).`;
}
