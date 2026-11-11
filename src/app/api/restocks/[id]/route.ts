// PATCH  /api/restocks/:id  { prompt?, everyDays?, active?, nextRunAt? }  ->  change, pause or move a restock
// DELETE /api/restocks/:id                                                  ->  remove it

import { UpdateRestockBody } from "@/schemas/api";
import * as database from "@/server/database";
import { NotFoundError } from "@/server/errors";
import { apiRoute, readJsonBody } from "@/server/http";

export const PATCH = apiRoute(async (request: Request, context: RouteContext<"/api/restocks/[id]">) => {
  const { id } = await context.params;
  const changes = await readJsonBody(request, UpdateRestockBody);
  const restock = await database.restocks.updateRestock(id, changes);
  if (!restock) throw new NotFoundError("That restock doesn't exist.");
  return Response.json(restock);
});

export const DELETE = apiRoute(async (_request: Request, context: RouteContext<"/api/restocks/[id]">) => {
  const { id } = await context.params;
  if (!(await database.restocks.removeRestock(id))) throw new NotFoundError("That restock doesn't exist.");
  return new Response(null, { status: 204 });
});
