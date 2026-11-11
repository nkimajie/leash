// The browser's way of talking to our API. Components call these readable functions
// instead of using fetch directly.

import type {
  AssistantEvent,
  ConnectPayPalThen,
  Decision,
  EarlierTurn,
  GridView,
  NewPayee,
  NewPreference,
  Payee,
  PayeeChanges,
  NewRestock,
  PayPalConnection,
  Preference,
  Restock,
  RestockChanges,
  RuleSuggestion,
  ServiceModes,
  SpendingRules,
  YourReason,
} from "@/schemas";

// ---------- decisions (purchases and payments) ----------

export const fetchDecisions = () => getJson<Decision[]>("/api/decisions");
export const fetchDecision = (id: string) => getJson<Decision>(`/api/decisions/${id}`);
export const approveDecision = (id: string) => sendJson<Decision>("POST", `/api/decisions/${id}/approve`);
export const denyDecision = (id: string, why: YourReason = {}) =>
  sendJson<Decision>("POST", `/api/decisions/${id}/deny`, why);
export const refundDecision = (id: string, why: YourReason = {}) =>
  sendJson<Decision>("POST", `/api/decisions/${id}/refund`, why);
/** "Held payments over $20" -> what the control room grid should show. */
export const askControlRoom = (question: string) => sendJson<GridView>("POST", "/api/control-room/ask", { question });

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

// ---------- recurring restocks ----------

export type RestockRun = { restock: Restock; decisions: Decision[]; reply: string };

export const fetchRestocks = () => getJson<Restock[]>("/api/restocks");
export const addRestock = (details: NewRestock) => sendJson<Restock>("POST", "/api/restocks", details);
export const updateRestock = (id: string, changes: RestockChanges) =>
  sendJson<Restock>("PATCH", `/api/restocks/${id}`, changes);
export const removeRestock = (id: string) => sendJson<void>("DELETE", `/api/restocks/${id}`);
export const runRestockNow = (id: string) => sendJson<RestockRun>("POST", `/api/restocks/${id}/run`);

// ---------- your PayPal account ----------

export const fetchPayPalConnection = () => getJson<PayPalConnection>("/api/paypal/connection");
export const startConnectingPayPal = (then: ConnectPayPalThen) =>
  sendJson<{ approvalUrl: string }>("POST", "/api/paypal/connect", { then });
export const disconnectPayPal = () => sendJson<PayPalConnection>("DELETE", "/api/paypal/connection");

// ---------- rules and status ----------

export const fetchSpendingRules = () => getJson<SpendingRules>("/api/rules");
export const saveSpendingRules = (rules: SpendingRules) => sendJson<SpendingRules>("PUT", "/api/rules", rules);
/** "Ask me before anything over $30" -> suggested rules, shown to you before anything is saved. */
export const suggestRuleChanges = (sentence: string) =>
  sendJson<RuleSuggestion>("POST", "/api/rules/suggest", { sentence });
export const fetchServiceModes = () => getJson<ServiceModes>("/api/status");
/** Demo mode only: put everything back to the sample data. */
export const resetDemo = () => sendJson<void>("POST", "/api/demo/reset");

// ---------- assistant ----------

/**
 * Sends a request to the assistant and calls `onStep` for each step as it streams in.
 * `spoken`: you said it out loud, so the assistant keeps its replies short enough to listen to.
 * `earlier`: the last few exchanges, so a follow-up like "yes, do that" makes sense.
 */
export async function askAssistant(
  prompt: string,
  onStep: (event: AssistantEvent) => void,
  spoken = false,
  earlier: EarlierTurn[] = [],
): Promise<void> {
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, spoken, earlier }),
  });
  await readSteps(response, onStep);
}

/** "Try to break the leash": plays a hijacked assistant and streams what the leash does. */
export async function runAttack(attackId: string, onStep: (event: AssistantEvent) => void): Promise<void> {
  await readSteps(await fetch(`/api/attacks/${attackId}`, { method: "POST" }), onStep);
}

/** Reads a stream of assistant steps, one JSON object per line. */
async function readSteps(response: Response, onStep: (event: AssistantEvent) => void): Promise<void> {
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
