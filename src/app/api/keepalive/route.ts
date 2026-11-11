// GET /api/keepalive   (header: Authorization: Bearer <CRON_SECRET>)
// Call it once a day from any scheduler (Render cron, GitHub Actions, cron-job.org). It does three things:
//   1. touches the database, so a free Supabase project never pauses for inactivity
//   2. runs any recurring restocks that are due (anything they buy waits for your OK)
//   3. releases reserved money you didn't answer within 7 days

import { connection } from "next/server";
import { apiRoute } from "@/server/http";
import { runDailyJob } from "@/server/restocks/daily-job";

export const GET = apiRoute(async (request: Request) => {
  await connection();
  return Response.json(await runDailyJob(request.headers.get("authorization")));
});
