import { z } from "zod";
import { DecisionStateError, refund } from "@/lib/purchase";

const Body = z.object({ id: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  try {
    return Response.json(await refund(parsed.data.id));
  } catch (err) {
    if (err instanceof DecisionStateError) return Response.json({ error: err.message }, { status: 409 });
    throw err;
  }
}
