// GET /api/v1/rules  ->  the person's spending rules, so an agent can plan within them
// The Leash API for outside AI agents: see src/schemas/leash-api.ts

import { connection } from "next/server";
import * as database from "@/server/database";
import { apiRoute } from "@/server/http";

export const GET = apiRoute(async () => {
  await connection();
  return Response.json(await database.spendingRules.loadSpendingRules());
});
