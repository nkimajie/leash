// Runs the agent for one goal and streams its steps to the browser as NDJSON
// (one JSON event per line), so the chat page can show the agent working live.

import { z } from "zod";
import type { AgentEvent } from "@/lib/agent-events";
import { runMockAgent } from "@/lib/agent-mock";
import * as store from "@/lib/store";

const Body = z.object({ prompt: z.string().trim().min(3).max(500) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Describe what you want the agent to buy." }, { status: 400 });
  }
  const { prompt } = parsed.data;
  const rules = await store.getRules();
  const goal = await store.createGoal(prompt, budgetFromPrompt(prompt) ?? rules.goalBudget);

  // TODO(step 5): use the Claude agent when ANTHROPIC_API_KEY is set.
  const events = runMockAgent(goal);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: AgentEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      send({ type: "goal", goal });
      try {
        for await (const event of events) send(event);
        await store.updateGoal(goal.id, { status: "done" });
      } catch (err) {
        console.error("agent failed", err);
        await store.updateGoal(goal.id, { status: "failed" });
        send({ type: "error", text: "The agent hit an unexpected error and stopped. Nothing else was bought." });
      }
      send({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// "under $60" / "max $60" / "budget of $60" -> 60
function budgetFromPrompt(prompt: string): number | null {
  const m = prompt.match(/(?:under|below|max(?:imum)?|budget(?: of)?|up to)\s*\$\s?(\d+(?:\.\d{1,2})?)/i);
  return m ? Number(m[1]) : null;
}
