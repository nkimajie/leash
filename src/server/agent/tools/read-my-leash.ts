import "server-only";

import { z } from "zod";
import { isSampleHistory } from "@/schemas";
import * as database from "@/server/database";
import { getPayPalConnection } from "@/server/payments/paypal-connection";
import { calculateSpendingSoFar } from "@/server/spending/check-spending-rules";
import type { LeashStatus } from "../what-leash-can-do";
import { defineTool } from "./define-tool";

export const readMyLeashTool = defineTool({
  name: "read_my_leash",
  description:
    "Read the user's leash as it is right now: their spending rules, what is paid or reserved today and this week (reserved money isn't spent yet), what is waiting for their approval (with ids), whether PayPal is connected, the people they pay, and what their twin remembers. Use it to answer questions about their account or what you can do for them, and to find something they want denied. It changes nothing.",
  inputSchema: z.object({}),
  async run() {
    const status = await readMyLeash();
    const money = (amount: number) => `$${amount.toFixed(2)}`;
    const summary = [
      status.paypal.connected ? "PayPal is connected." : "PayPal isn't connected yet.",
      `I pay up to ${money(status.rules.autoApproveLimit)} without asking.`,
      `${money(status.paidOrReserved.today)} paid or reserved today, of your ${money(status.rules.dailyCap)} daily cap.`,
      `${status.waitingForYou.length} waiting for you.`,
    ].join(" ");
    return { summary, data: status };
  },
});

async function readMyLeash(): Promise<LeashStatus> {
  const [rules, decisions, people, preferences, restocks, paypal] = await Promise.all([
    database.spendingRules.loadSpendingRules(),
    database.decisions.listDecisions(),
    database.payees.listPayees(),
    database.preferences.listPreferences(),
    database.restocks.listRestocks(),
    getPayPalConnection(),
  ]);
  const soFar = calculateSpendingSoFar(decisions, "", 0);
  return {
    paypal: { mode: paypal.mode, connected: paypal.connected, payerEmail: paypal.payerEmail },
    rules: {
      currency: rules.currency,
      autoApproveLimit: rules.autoApproveLimit,
      maxItemPrice: rules.maxItemPrice,
      maxPaymentPerPerson: rules.maxPaymentPerPerson,
      dailyCap: rules.dailyCap,
      weeklyCap: rules.weeklyCap,
      blockedCategories: rules.blockedCategories,
      newPeopleNeedApproval: rules.newPeopleNeedApproval,
    },
    paidOrReserved: { today: soFar.spentToday, thisWeek: soFar.spentThisWeek },
    waitingForYou: decisions
      .filter((d) => d.outcome === "held" && !isSampleHistory(d))
      .map((d) => ({ id: d.id, title: d.title, amount: d.amount, why: d.ruleExplanation })),
    people: people.map((p) => ({ name: p.name, trusted: p.trusted, hasPayPalEmail: Boolean(p.email) })),
    twinRemembers: preferences.map((p) => `${p.sentiment === "likes" ? "Likes" : "Avoids"}: ${p.statement}`),
    restocks: restocks.map((r) => ({ prompt: r.prompt, everyDays: r.everyDays })),
  };
}
