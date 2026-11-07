// POST /api/rules/suggest  { sentence }
// Turns rules described in plain words into suggested rules. Nothing is saved until you confirm.

import { SuggestRulesBody } from "@/schemas/api";
import { suggestRuleChanges } from "@/server/agent/suggest-rule-changes";
import { apiRoute, readJsonBody } from "@/server/http";

export const POST = apiRoute(async (request: Request) => {
  const { sentence } = await readJsonBody(request, SuggestRulesBody);
  return Response.json(await suggestRuleChanges(sentence));
});
