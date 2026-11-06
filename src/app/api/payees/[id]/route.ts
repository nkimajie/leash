// PATCH  /api/payees/:id  { name?, email?, note?, trusted? }  ->  update a person
// DELETE /api/payees/:id                                       ->  remove a person

import { UpdatePayeeBody } from "@/schemas/api";
import * as database from "@/server/database";
import { NotFoundError } from "@/server/errors";
import { apiRoute, readJsonBody } from "@/server/http";

export const PATCH = apiRoute(async (request: Request, context: RouteContext<"/api/payees/[id]">) => {
  const { id } = await context.params;
  const changes = await readJsonBody(request, UpdatePayeeBody);
  const payee = await database.payees.updatePayee(id, changes);
  if (!payee) throw new NotFoundError("That person isn't on your list.");
  return Response.json(payee);
});

export const DELETE = apiRoute(async (_request: Request, context: RouteContext<"/api/payees/[id]">) => {
  const { id } = await context.params;
  if (!(await database.payees.removePayee(id))) throw new NotFoundError("That person isn't on your list.");
  return new Response(null, { status: 204 });
});
