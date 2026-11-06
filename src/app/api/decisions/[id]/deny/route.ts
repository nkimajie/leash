// POST /api/decisions/:id/deny
// You said no: PayPal releases the reserved money.

import { apiRoute } from "@/server/http";
import { denyHeldDecision } from "@/server/spending/spending-service";

export const POST = apiRoute(async (_request: Request, context: RouteContext<"/api/decisions/[id]/deny">) => {
  const { id } = await context.params;
  return Response.json(await denyHeldDecision(id));
});
