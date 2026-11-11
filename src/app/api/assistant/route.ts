// POST /api/assistant  { prompt, spoken?, earlier? }
// Runs the assistant and streams each step back as it happens: one JSON object per line.

import { RunAssistantBody } from "@/schemas/api";
import { visitorOf } from "@/server/agent/claude-allowance";
import { runAssistant } from "@/server/agent/run-assistant";
import { apiRoute, readJsonBody, streamEvents } from "@/server/http";

export const POST = apiRoute(async (request: Request) => {
  const { prompt, spoken, earlier } = await readJsonBody(request, RunAssistantBody);
  return streamEvents(runAssistant(prompt, "you", visitorOf(request), spoken, earlier));
});
