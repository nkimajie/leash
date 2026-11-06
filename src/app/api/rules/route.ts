// GET /api/rules  ->  your spending rules (the leash)
// PUT /api/rules  { ...all rules }  ->  replace them

import { connection } from "next/server";
import { UpdateRulesBody } from "@/schemas/api";
import * as database from "@/server/database";
import { apiRoute, readJsonBody } from "@/server/http";

export const GET = apiRoute(async () => {
  await connection();
  return Response.json(await database.spendingRules.loadSpendingRules());
});

export const PUT = apiRoute(async (request: Request) => {
  const rules = await readJsonBody(request, UpdateRulesBody);
  return Response.json(await database.spendingRules.saveSpendingRules(rules));
});
