// GET    /api/conversation  ->  what Leash remembers: your last few exchanges and what it did in them
// DELETE /api/conversation  ->  "Start fresh": Leash forgets them (your receipts stay)

import { connection } from "next/server";
import { forgetConversation, recallConversation } from "@/server/agent/conversation-memory";
import { apiRoute } from "@/server/http";

export const GET = apiRoute(async () => {
  await connection();
  return Response.json(await recallConversation());
});

export const DELETE = apiRoute(async () => {
  await forgetConversation();
  return new Response(null, { status: 204 });
});
