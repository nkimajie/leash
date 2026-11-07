// GET  /api/restocks                          ->  your recurring restocks
// POST /api/restocks  { prompt, everyDays }   ->  add one

import { connection } from "next/server";
import { CreateRestockBody } from "@/schemas/api";
import * as database from "@/server/database";
import { apiRoute, readJsonBody } from "@/server/http";

export const GET = apiRoute(async () => {
  await connection();
  return Response.json(await database.restocks.listRestocks());
});

export const POST = apiRoute(async (request: Request) => {
  const details = await readJsonBody(request, CreateRestockBody);
  return Response.json(await database.restocks.addRestock(details), { status: 201 });
});
