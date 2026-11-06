// POST /api/decisions/:id/refund
// Give the money back for a paid purchase or payment.

import { apiRoute } from "@/server/http";
import { refundDecision } from "@/server/spending/spending-service";

export const POST = apiRoute(async (_request: Request, context: RouteContext<"/api/decisions/[id]/refund">) => {
  const { id } = await context.params;
  return Response.json(await refundDecision(id));
});
