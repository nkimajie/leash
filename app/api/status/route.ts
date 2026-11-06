// Which services are live vs mocked, plus the current rules. Shown as badges in the UI.

import { connection } from "next/server";
import { getModes } from "@/lib/modes";
import { getRules } from "@/lib/store";

export async function GET() {
  await connection();
  return Response.json({ modes: getModes(), rules: await getRules() });
}
