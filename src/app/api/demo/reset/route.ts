// POST /api/demo/reset
// Demo mode only: puts every purchase, payment, rule, person and preference back to the sample data.

import { apiRoute } from "@/server/http";
import { resetDemo } from "@/server/demo-mode";

export const POST = apiRoute(async () => {
  await resetDemo();
  return new Response(null, { status: 204 });
});
