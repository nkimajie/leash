// GET /api/status  ->  which services are live and which run in mock mode

import { connection } from "next/server";
import { serviceModes } from "@/server/config/environment";
import { apiRoute } from "@/server/http";

export const GET = apiRoute(async () => {
  await connection();
  return Response.json(serviceModes());
});
