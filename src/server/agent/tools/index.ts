import "server-only";

// Every tool the assistant can use. Both the Claude agent and the mock assistant call
// tools through `runTool`, so they share exactly the same behaviour and rules.

import { z } from "zod";
import { buyProductTool } from "./buy-product";
import { checkPaymentRulesTool, checkPurchaseRulesTool } from "./check-rules";
import type { AssistantTool, ToolContext, ToolResult } from "./define-tool";
import { denyHeldItemTool } from "./deny-held-item";
import { lookUpSpendingTool } from "./look-up-spending";
import { openPageTool } from "./open-page";
import { payPersonTool } from "./pay-person";
import { recallPreferencesTool, rememberPreferenceTool } from "./preferences";
import { readMyLeashTool } from "./read-my-leash";
import { scheduleRestockTool } from "./schedule-restock";
import { searchProductsTool } from "./search-products";

export type { ToolContext, ToolResult } from "./define-tool";

export const ASSISTANT_TOOLS = [
  searchProductsTool,
  checkPurchaseRulesTool,
  buyProductTool,
  checkPaymentRulesTool,
  payPersonTool,
  scheduleRestockTool,
  recallPreferencesTool,
  rememberPreferenceTool,
  readMyLeashTool,
  lookUpSpendingTool,
  denyHeldItemTool,
  openPageTool,
] as AssistantTool[];

export async function runTool(name: string, input: unknown, context: ToolContext): Promise<ToolResult> {
  const tool = ASSISTANT_TOOLS.find((t) => t.name === name);
  if (!tool) return { summary: `Unknown tool "${name}".` };
  const parsed = tool.inputSchema.safeParse(input);
  if (!parsed.success) return { summary: `Invalid input for ${name}: ${z.prettifyError(parsed.error)}` };
  return tool.run(parsed.data, context);
}

/** Tool descriptions in the JSON Schema format AI models expect. Used by the Claude agent. */
export function describeToolsForModel() {
  return ASSISTANT_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: z.toJSONSchema(tool.inputSchema) as { type: "object"; [key: string]: unknown },
  }));
}
