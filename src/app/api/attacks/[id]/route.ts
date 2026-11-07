// POST /api/attacks/:id
// "Try to break the leash": plays a hijacked assistant and streams what the leash does,
// one JSON object per line, like the assistant itself.

import { findAttack, runAttack } from "@/server/agent/run-attack";
import { apiRoute, streamEvents } from "@/server/http";

export const POST = apiRoute(async (_request: Request, context: RouteContext<"/api/attacks/[id]">) => {
  const { id } = await context.params;
  findAttack(id); // 404 before streaming starts
  return streamEvents(runAttack(id));
});
