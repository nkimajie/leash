// Shapes of request bodies the API accepts. Routes validate every body with these.

import { z } from "zod";

export const RunAssistantBody = z.object({
  prompt: z.string().trim().min(3, "Tell the assistant what you need.").max(500),
});

export { NewPayeeSchema as CreatePayeeBody, PayeeChangesSchema as UpdatePayeeBody } from "./payee";
export { NewPreferenceSchema as CreatePreferenceBody } from "./preference";
export { NewRestockSchema as CreateRestockBody, RestockChangesSchema as UpdateRestockBody } from "./restock";
export { SpendingRulesSchema as UpdateRulesBody } from "./spending-rules";
