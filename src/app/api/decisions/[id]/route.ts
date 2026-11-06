// GET /api/decisions/:id  ->  one purchase or payment

import * as database from "@/server/database";
import { NotFoundError } from "@/server/errors";
import { apiRoute } from "@/server/http";

export const GET = apiRoute(async (_request: Request, context: RouteContext<"/api/decisions/[id]">) => {
  const { id } = await context.params;
  const decision = await database.decisions.findDecisionById(id);
  if (!decision) throw new NotFoundError("We couldn't find that purchase or payment.");
  return Response.json(decision);
});
