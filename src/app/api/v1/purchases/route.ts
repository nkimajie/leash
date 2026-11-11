// POST /api/v1/purchases  { productId, reasoning, agentName? }  ->  what happened: paid, held for the person's OK, or blocked
// The Leash API for outside AI agents: see src/schemas/leash-api.ts

import { PurchaseBody } from "@/schemas";
import { apiRoute, readJsonBody } from "@/server/http";
import { buyForAgent } from "@/server/leash-api/leash-api";

export const POST = apiRoute(async (request: Request) => {
  const purchase = await readJsonBody(request, PurchaseBody);
  return Response.json(await buyForAgent(purchase), { status: 201 });
});
