// POST /api/decisions/:id/approve
// You said yes: PayPal takes the reserved money.

import { apiRoute } from "@/server/http";
import { approveHeldDecision } from "@/server/spending/spending-service";

export const POST = apiRoute(async (_request: Request, context: RouteContext<"/api/decisions/[id]/approve">) => {
  const { id } = await context.params;
  return Response.json(await approveHeldDecision(id));
});
