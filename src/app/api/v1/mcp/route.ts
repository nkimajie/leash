// POST /api/v1/mcp  { JSON-RPC message }  ->  Leash as an MCP server: Claude Desktop, a claude.ai connector or
// Claude Code can shop and pay on the person's leash, and never approve anything. See server/leash-api/mcp.ts.
// GET has nothing to stream, so it's 405 (MCP's Streamable HTTP allows that).

import { apiRoute } from "@/server/http";
import { answerMcpMessage } from "@/server/leash-api/mcp";

export const POST = apiRoute(async (request: Request) => {
  // Not readJsonBody: a bad message gets a JSON-RPC error back, which MCP clients understand.
  const answer = await answerMcpMessage(await request.json().catch(() => null));
  return answer ? Response.json(answer) : new Response(null, { status: 202 });
});

export const GET = () => new Response(null, { status: 405, headers: { Allow: "POST" } });
