import "server-only";

// Leash as an MCP server (Model Context Protocol), at POST /api/v1/mcp. Any MCP client, like Claude
// Desktop, a claude.ai connector or Claude Code, can then shop and pay on the person's leash. Its tools
// are the Leash API's (see leash-api.ts), so the rules, PayPal and the twin behave exactly the same.
// Like the API, there's no tool to approve anything: only the person can, with a tap in Leash.
//
// This is MCP's Streamable HTTP transport in its simplest form: each POST carries one JSON-RPC message
// and gets one JSON answer. These tools need no sessions and no event stream.

import { z } from "zod";
import { PaymentBody, PurchaseBody, type Decision } from "@/schemas";
import { searchWithTwinNotes } from "@/server/agent/tools/search-products";
import * as database from "@/server/database";
import { BadRequestError, ConflictError, NotFoundError } from "@/server/errors";
import { findDecisionToDecide } from "@/server/spending/spending-service";
import { buyForAgent, payForAgent } from "./leash-api";

const SERVER = { name: "leash", title: "Leash", version: "1.0.0" };
const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const INSTRUCTIONS =
  "Leash puts you on the person's spending leash. Search with search_products, then buy_product or pay_person. " +
  "Within their rules PayPal pays at once. Anything else, PayPal only reserves until the person approves it in " +
  "Leash, and hard rules block it outright. You can't approve anything: tell the person to tap Approve in Leash, " +
  "and use check_decision to see what they decided. Call read_rules to plan within their limits.";

/** Receipts show who asked; an agent that doesn't say is shown as this. */
const DEFAULT_AGENT = "AI agent via MCP";

type McpTool = {
  name: string;
  description: string;
  input: z.ZodType<Record<string, unknown>>;
  run: (input: never) => Promise<{ text: string }>;
};

const defineTool = <Input extends z.ZodType<Record<string, unknown>>>(tool: {
  name: string;
  description: string;
  input: Input;
  run: (input: z.infer<Input>) => Promise<{ text: string }>;
}): McpTool => tool as McpTool;

const TOOLS: McpTool[] = [
  defineTool({
    name: "search_products",
    description:
      "Search real stores. Each result has an id to buy with, a price, and what the person's twin thinks of it (likes or avoids).",
    input: z.object({
      query: z.string().trim().min(2).max(200).describe("What to look for, e.g. 'fair-trade coffee beans'"),
      maxPrice: z.number().positive().optional().describe("Highest price in USD"),
    }),
    run: async ({ query, maxPrice }) => ({ text: JSON.stringify(await searchWithTwinNotes(query, maxPrice)) }),
  }),
  defineTool({
    name: "buy_product",
    description:
      "Buy a product found with search_products. Leash applies the person's rules: paid now, reserved until they approve, or blocked.",
    input: PurchaseBody,
    run: async (purchase) =>
      describeDecision(await buyForAgent({ ...purchase, agentName: purchase.agentName ?? DEFAULT_AGENT })),
  }),
  defineTool({
    name: "pay_person",
    description: "Pay someone from the person's contacts with PayPal. Someone new always waits for the person's okay.",
    input: PaymentBody,
    run: async (payment) =>
      describeDecision(await payForAgent({ ...payment, agentName: payment.agentName ?? DEFAULT_AGENT })),
  }),
  defineTool({
    name: "check_decision",
    description: "Where a purchase or payment stands, e.g. whether the person approved it, and its delivery.",
    input: z.object({ decisionId: z.string().min(1).describe("The id buy_product or pay_person returned") }),
    run: async ({ decisionId }) => describeDecision(await findDecisionToDecide(decisionId)),
  }),
  defineTool({
    name: "read_rules",
    description: "The person's spending rules: what Leash pays without asking, hard limits, and daily and weekly caps.",
    input: z.object({}),
    run: async () => ({ text: JSON.stringify(await database.spendingRules.loadSpendingRules()) }),
  }),
];

/** What happened, said to the agent: "you" is the agent, "the person" is who holds the leash. */
const OUTCOME_FOR_AGENT: Record<Decision["outcome"], string> = {
  auto_approved: "Paid: within the person's rules, so PayPal took the money.",
  held: "Reserved: PayPal holds the money until the person approves it in Leash. You can't approve it; check back with check_decision.",
  approved: "Paid: the person approved it.",
  denied: "Denied by the person. PayPal released the money, so nothing was charged.",
  blocked: "Blocked by a hard rule. PayPal was never called.",
  refunded: "Refunded to the person.",
  failed: "PayPal couldn't finish it. Nothing was charged.",
};

/** A line the agent understands, the rule's reason, then the full record. */
function describeDecision(decision: Decision): { text: string } {
  const line = `${decision.title}, $${decision.amount.toFixed(2)}: ${OUTCOME_FOR_AGENT[decision.outcome]}`;
  return { text: `${line}\nWhy: ${decision.ruleExplanation}\n\n${JSON.stringify(decision)}` };
}

// ---------- JSON-RPC ----------

const JsonRpcMessage = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

/** Answers one JSON-RPC message. A notification (no id) gets no answer, so this returns null. */
export async function answerMcpMessage(message: unknown): Promise<object | null> {
  const parsed = JsonRpcMessage.safeParse(message);
  if (!parsed.success) return rpcError(null, -32600, "Expected one JSON-RPC 2.0 message.");
  const { id, method, params = {} } = parsed.data;
  if (id === undefined) return null; // e.g. "notifications/initialized"

  switch (method) {
    case "initialize": {
      const asked = String(params.protocolVersion ?? "");
      const protocolVersion = PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0];
      return rpcResult(id, {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: SERVER,
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, {
        tools: TOOLS.map(({ name, description, input }) => ({
          name,
          description,
          inputSchema: z.toJSONSchema(input, { io: "input" }),
        })),
      });
    case "tools/call":
      return rpcResult(id, await callTool(String(params.name), params.arguments ?? {}));
    default:
      return rpcError(id, -32601, `Leash doesn't support "${method}".`);
  }
}

/** A tool's problems go back to the agent as an error result it can read, not as a protocol error. */
async function callTool(name: string, args: unknown) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return toolError(`There's no tool called "${name}".`);
  const input = tool.input.safeParse(args);
  if (!input.success) return toolError(z.prettifyError(input.error));
  try {
    const { text } = await tool.run(input.data as never);
    return { content: [{ type: "text", text }] };
  } catch (error) {
    const expected =
      error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ConflictError;
    if (!expected) throw error;
    return toolError(error.message);
  }
}

const toolError = (text: string) => ({ content: [{ type: "text", text }], isError: true });
const rpcResult = (id: string | number, result: object) => ({ jsonrpc: "2.0", id, result });
const rpcError = (id: string | number | null, code: number, message: string) => ({
  jsonrpc: "2.0",
  id,
  error: { code, message },
});
