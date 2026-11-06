// GET  /api/preferences  ->  what your digital twin knows about you
// POST /api/preferences  { sentiment, statement, category?, merchant?, priceAtLeast? }  ->  teach it something

import { connection } from "next/server";
import { CreatePreferenceBody } from "@/schemas/api";
import * as database from "@/server/database";
import { apiRoute, readJsonBody } from "@/server/http";

export const GET = apiRoute(async () => {
  await connection();
  return Response.json(await database.preferences.listPreferences());
});

export const POST = apiRoute(async (request: Request) => {
  const details = await readJsonBody(request, CreatePreferenceBody);
  return Response.json(await database.preferences.addPreference({ ...details, source: "you" }), { status: 201 });
});
