import { z } from "zod";
import type { Decision } from "./decision";

/** One message you send the assistant ("Restock my coffee, under $60"). */
export const AssistantRequestSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  budget: z.number(),
  status: z.enum(["working", "finished", "failed"]),
  /** "you" typed it; "restock" means a schedule started it while you were away. */
  source: z.enum(["you", "restock"]),
  createdAt: z.string(),
});
export type AssistantRequest = z.infer<typeof AssistantRequestSchema>;

/**
 * Live steps streamed from the server to the assistant page, one JSON object per line.
 * The page renders each one as it arrives, so you can watch the assistant work.
 */
export type AssistantEvent =
  | { type: "request_started"; request: AssistantRequest }
  | { type: "thinking"; text: string }
  /** The scam message in a "Try to break the leash" attack. */
  | { type: "attack"; text: string }
  | { type: "tool_started"; tool: string; input: Record<string, unknown> }
  | { type: "tool_finished"; tool: string; summary: string }
  | { type: "decision_made"; decision: Decision }
  | { type: "reply"; text: string }
  | { type: "error"; message: string }
  | { type: "finished" };
