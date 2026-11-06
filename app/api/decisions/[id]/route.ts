import { getDecision } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/decisions/[id]">) {
  const { id } = await ctx.params;
  const decision = await getDecision(id);
  if (!decision) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(decision);
}
