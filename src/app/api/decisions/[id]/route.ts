// GET /api/decisions/:id  ->  one purchase or payment (a held payment shows the person's current PayPal email)

import { apiRoute } from "@/server/http";
import { findDecisionToDecide } from "@/server/spending/spending-service";

export const GET = apiRoute(async (_request: Request, context: RouteContext<"/api/decisions/[id]">) => {
  const { id } = await context.params;
  return Response.json(await findDecisionToDecide(id));
});
