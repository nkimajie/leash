// POST /api/v1/payments  { personName, amount, note?, reasoning, agentName? }  ->  what happened to the money
// The Leash API for outside AI agents: see src/schemas/leash-api.ts

import { PaymentBody } from "@/schemas";
import { apiRoute, readJsonBody } from "@/server/http";
import { payForAgent } from "@/server/leash-api/leash-api";

export const POST = apiRoute(async (request: Request) => {
  const payment = await readJsonBody(request, PaymentBody);
  return Response.json(await payForAgent(payment), { status: 201 });
});
