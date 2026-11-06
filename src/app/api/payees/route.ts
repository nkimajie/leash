// GET  /api/payees  ->  people the assistant can pay
// POST /api/payees  { name, email?, note?, trusted? }  ->  add a person

import { connection } from "next/server";
import { CreatePayeeBody } from "@/schemas/api";
import * as database from "@/server/database";
import { apiRoute, readJsonBody } from "@/server/http";

export const GET = apiRoute(async () => {
  await connection();
  return Response.json(await database.payees.listPayees());
});

export const POST = apiRoute(async (request: Request) => {
  const details = await readJsonBody(request, CreatePayeeBody);
  return Response.json(await database.payees.addPayee(details), { status: 201 });
});
