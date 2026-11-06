import { connection } from "next/server";
import { listDecisions } from "@/lib/store";

export async function GET() {
  await connection(); // always read fresh data, never prerender
  return Response.json(await listDecisions());
}
