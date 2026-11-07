import "server-only";

// "Rules in one sentence": Claude reads "ask me before anything over $30, and no alcohol"
// and suggests new rules. Nothing is saved here: you see each change and confirm it first.

import { RuleChangesSchema, type RuleSuggestion } from "@/schemas";
import * as database from "@/server/database";
import { askClaudeFor } from "./ask-claude";
import { applyRuleChanges, describeRuleChanges, readRulesSentence } from "./read-rules-sentence";

const INSTRUCTIONS = `You set spending rules for a personal AI shopping assistant. Turn the user's sentence into rule changes.
- autoApproveLimit: paid without asking up to this amount ("ask me before anything over $30" -> 30).
- defaultRequestBudget: the budget for one request.
- maxItemPrice: never buy a single item above this. maxPaymentPerPerson: never send one person more than this.
- dailyCap and weeklyCap: total spending limits.
- blockCategories / unblockCategories: lowercase plural product categories, e.g. "alcohol", "gift cards", "snacks".
- blockMerchants: store names to never buy from.
- newPeopleNeedApproval: true if the user wants to approve payments to anyone new.
Leave everything the sentence doesn't mention null or empty. All amounts are US dollars.`;

export async function suggestRuleChanges(sentence: string): Promise<RuleSuggestion> {
  const rules = await database.spendingRules.loadSpendingRules();
  const changes =
    (await askClaudeFor(RuleChangesSchema, INSTRUCTIONS, `Current rules: ${JSON.stringify(rules)}\n\n${sentence}`)) ??
    readRulesSentence(sentence);
  const proposed = applyRuleChanges(rules, changes);
  return { proposed, changes: describeRuleChanges(rules, proposed) };
}
