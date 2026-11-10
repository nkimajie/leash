import type { z } from "zod";
import type { AssistantRequest, Decision, SearchResult } from "@/schemas";

/** What every tool gets when it runs: the request it is working on. */
export type ToolContext = { request: AssistantRequest };

export type ToolResult = {
  /** Short, readable result. Shown on the assistant page and sent back to the AI model. */
  summary: string;
  /** Set when the tool moved (or tried to move) money. */
  decision?: Decision;
  /** Set by a product search, for the assistant page to show. */
  products?: SearchResult[];
  /** Set when you asked to go to another page. */
  openPage?: { path: string; label: string };
  /** Structured data for the AI model. */
  data?: unknown;
};

/** A capability the assistant can use, e.g. searching products or paying a person. */
export type AssistantTool<Input = unknown> = {
  name: string;
  /** Tells the AI model when and how to use the tool. */
  description: string;
  inputSchema: z.ZodType<Input>;
  run: (input: Input, context: ToolContext) => Promise<ToolResult>;
};

/** Helper so each tool's input type is inferred from its schema. */
export function defineTool<Input>(tool: AssistantTool<Input>): AssistantTool<Input> {
  return tool;
}
