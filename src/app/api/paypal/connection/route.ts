// GET    /api/paypal/connection   Is your PayPal account connected?
// DELETE /api/paypal/connection   Forget the saved PayPal account.

import { connection } from "next/server";
import { apiRoute } from "@/server/http";
import { disconnectPayPal, getPayPalConnection } from "@/server/payments/paypal-connection";

export const GET = apiRoute(async () => {
  await connection();
  return Response.json(await getPayPalConnection());
});

export const DELETE = apiRoute(async () => {
  await disconnectPayPal();
  return Response.json(await getPayPalConnection());
});
