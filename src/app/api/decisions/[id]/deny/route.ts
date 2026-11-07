// POST /api/decisions/:id/deny   { reason?, note? }
// You said no: PayPal releases the reserved money. If you said why, your twin learns it.

import { YourReasonBody } from "@/schemas/api";
import { apiRoute, readJsonBody } from "@/server/http";
import { denyHeldDecision } from "@/server/spending/spending-service";

export const POST = apiRoute(async (request: Request, context: RouteContext<"/api/decisions/[id]/deny">) => {
  const { id } = await context.params;
  const why = await readJsonBody(request, YourReasonBody);
  return Response.json(await denyHeldDecision(id, why));
});
