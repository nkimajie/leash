// Shapes of request bodies the API accepts. Routes validate every body with these.

import { z } from "zod";
import { EarlierTurnSchema } from "./assistant";
import { YourReasonSchema } from "./preference";

export const RunAssistantBody = z.object({
  prompt: z.string().trim().min(2, "Tell the assistant what you need.").max(500),
  /** You said it out loud: the assistant keeps its replies short enough to listen to. */
  spoken: z.boolean().optional().default(false),
  /** The last few exchanges, oldest first. They help Leash understand a follow-up; they can't move money. */
  earlier: z.array(EarlierTurnSchema).max(3).default([]),
});

export const SuggestRulesBody = z.object({
  sentence: z.string().trim().min(5, "Describe the rule in a few words.").max(300),
});

/** Deny and refund accept an optional reason; an empty body is fine too. */
export const YourReasonBody = YourReasonSchema.optional().default({});

export { NewPayeeSchema as CreatePayeeBody, PayeeChangesSchema as UpdatePayeeBody } from "./payee";
export { NewPreferenceSchema as CreatePreferenceBody } from "./preference";
export { NewRestockSchema as CreateRestockBody, RestockChangesSchema as UpdateRestockBody } from "./restock";
export { SpendingRulesSchema as UpdateRulesBody } from "./spending-rules";
