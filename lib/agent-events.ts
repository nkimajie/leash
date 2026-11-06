// Events streamed from /api/agent to the chat page, one JSON object per line.
// Shared by the server (agent) and the browser (chat page).

import type { Decision, Goal, PolicyResult } from "./types";

export type AgentEvent =
  | { type: "goal"; goal: Goal }
  | { type: "thought"; text: string }
  | { type: "tool_call"; tool: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool: string; summary: string }
  | { type: "decision"; decision: Decision; policy: PolicyResult }
  | { type: "message"; text: string }
  | { type: "error"; text: string }
  | { type: "done" };
