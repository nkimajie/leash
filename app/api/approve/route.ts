// Human decision on a held purchase: approve -> capture, deny -> void.

import { z } from "zod";
import { approve, DecisionStateError, deny } from "@/lib/purchase";

const Body = z.object({ id: z.string().min(1), action: z.enum(["approve", "deny"]) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const { id, action } = parsed.data;
  try {
    const decision = action === "approve" ? await approve(id) : await deny(id);
    return Response.json(decision);
  } catch (err) {
    if (err instanceof DecisionStateError) return Response.json({ error: err.message }, { status: 409 });
    throw err;
  }
}
