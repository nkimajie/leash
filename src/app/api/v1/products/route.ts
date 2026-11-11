// GET /api/v1/products?query=coffee+beans&maxPrice=20  ->  products, with what the person's twin thinks of each
// The Leash API for outside AI agents: see src/schemas/leash-api.ts

import { connection } from "next/server";
import { ProductSearchQuery } from "@/schemas";
import { searchWithTwinNotes } from "@/server/agent/tools/search-products";
import { apiRoute, readSearchParams } from "@/server/http";

export const GET = apiRoute(async (request: Request) => {
  await connection();
  const { query, maxPrice } = readSearchParams(request, ProductSearchQuery);
  return Response.json(await searchWithTwinNotes(query, maxPrice));
});
