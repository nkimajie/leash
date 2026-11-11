// GET /api/v1/decisions/:id  ->  where a purchase or payment stands, e.g. whether the person approved it
// The Leash API for outside AI agents: see src/schemas/leash-api.ts

import { connection } from "next/server";
import { apiRoute } from "@/server/http";
import { findDecisionToDecide } from "@/server/spending/spending-service";

export const GET = apiRoute(async (_request: Request, context: RouteContext<"/api/v1/decisions/[id]">) => {
  await connection();
  const { id } = await context.params;
  return Response.json(await findDecisionToDecide(id));
});
