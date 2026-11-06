// GET /api/decisions  ->  every purchase and payment, newest first

import { connection } from "next/server";
import * as database from "@/server/database";
import { apiRoute } from "@/server/http";

export const GET = apiRoute(async () => {
  await connection(); // always read fresh data
  return Response.json(await database.decisions.listDecisions());
});
