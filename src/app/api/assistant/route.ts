// POST /api/assistant  { prompt }
// Runs the assistant and streams each step back as it happens: one JSON object per line.

import type { AssistantEvent } from "@/schemas";
import { RunAssistantBody } from "@/schemas/api";
import { runAssistant } from "@/server/agent/run-assistant";
import { apiRoute, readJsonBody } from "@/server/http";

export const POST = apiRoute(async (request: Request) => {
  const { prompt } = await readJsonBody(request, RunAssistantBody);
  const steps = runAssistant(prompt);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AssistantEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      for await (const step of steps) send(step);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
});
