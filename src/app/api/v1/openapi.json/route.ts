// GET /api/v1/openapi.json  ->  the Leash API's OpenAPI document, for SDK generators and AI agents

import { leashApiDocument } from "@/schemas";

export const GET = () => Response.json(leashApiDocument());
