// GET /api/keepalive   (header: Authorization: Bearer <CRON_SECRET>)
// Called once a day by a Render Cron Job. It does two things:
//   1. touches the database, so a free Supabase project never pauses for inactivity
//   2. runs any recurring restocks that are due (anything they buy waits for your OK)

import { connection } from "next/server";
import { apiRoute } from "@/server/http";
import { runDailyJob } from "@/server/restocks/daily-job";

export const GET = apiRoute(async (request: Request) => {
  await connection();
  return Response.json(await runDailyJob(request.headers.get("authorization")));
});
