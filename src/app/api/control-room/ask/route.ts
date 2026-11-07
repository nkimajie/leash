// POST /api/control-room/ask  { question }
// Turns a question in plain English into a view of the control room grid.

import { AskControlRoomBody } from "@/schemas";
import { askControlRoom } from "@/server/agent/ask-control-room";
import { apiRoute, readJsonBody } from "@/server/http";

export const POST = apiRoute(async (request: Request) => {
  const { question } = await readJsonBody(request, AskControlRoomBody);
  return Response.json(await askControlRoom(question));
});
