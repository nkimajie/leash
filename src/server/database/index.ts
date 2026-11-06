// The database section. Everything that reads or writes stored data goes through here,
// grouped by table, e.g. `database.decisions.listDecisions()`.

export * as assistantRequests from "./assistant-requests-repository";
export * as decisions from "./decisions-repository";
export * as payees from "./payees-repository";
export * as preferences from "./preferences-repository";
export * as spendingRules from "./spending-rules-repository";
