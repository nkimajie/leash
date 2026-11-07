// POST /api/decisions/:id/refund   { reason?, note? }
// Give the money back for a paid purchase or payment. If you said why, your twin learns it.

import { YourReasonBody } from "@/schemas/api";
import { apiRoute, readJsonBody } from "@/server/http";
import { refundDecision } from "@/server/spending/spending-service";

export const POST = apiRoute(async (request: Request, context: RouteContext<"/api/decisions/[id]/refund">) => {
  const { id } = await context.params;
  const why = await readJsonBody(request, YourReasonBody);
  return Response.json(await refundDecision(id, why));
});
