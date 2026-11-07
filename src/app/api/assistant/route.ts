// POST /api/assistant  { prompt }
// Runs the assistant and streams each step back as it happens: one JSON object per line.

import { RunAssistantBody } from "@/schemas/api";
import { runAssistant } from "@/server/agent/run-assistant";
import { apiRoute, readJsonBody, streamEvents } from "@/server/http";

export const POST = apiRoute(async (request: Request) => {
  const { prompt } = await readJsonBody(request, RunAssistantBody);
  return streamEvents(runAssistant(prompt));
});
