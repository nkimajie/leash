// POST /api/restocks/:id/run
// Runs a restock right now instead of waiting for its date. Anything it buys is held for you.

import { apiRoute } from "@/server/http";
import { runRestockNow } from "@/server/restocks/restock-service";

export const POST = apiRoute(async (_request: Request, context: RouteContext<"/api/restocks/[id]/run">) => {
  const { id } = await context.params;
  return Response.json(await runRestockNow(id));
});
