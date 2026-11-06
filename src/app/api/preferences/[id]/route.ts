// DELETE /api/preferences/:id  ->  make your twin forget something

import * as database from "@/server/database";
import { NotFoundError } from "@/server/errors";
import { apiRoute } from "@/server/http";

export const DELETE = apiRoute(async (_request: Request, context: RouteContext<"/api/preferences/[id]">) => {
  const { id } = await context.params;
  if (!(await database.preferences.removePreference(id))) throw new NotFoundError("Nothing to forget.");
  return new Response(null, { status: 204 });
});
