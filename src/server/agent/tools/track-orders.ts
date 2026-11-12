import "server-only";

import { z } from "zod";
import { isSampleHistory } from "@/schemas";
import * as database from "@/server/database";
import { describeDelivery } from "@/server/delivery/delivery";
import { pickByTitle } from "../read-command";
import { defineTool } from "./define-tool";

// "Where are my beans?" Leash tracks what it bought: the carrier, tracking number, the address it
// ships to (from your PayPal account) and the day it arrives.

export const trackOrdersTool = defineTool({
  name: "track_orders",
  description:
    'Where the user\'s purchases are: on the way or delivered, with the carrier, tracking number, the address it ships to (from their PayPal account) and the day it arrives. Use it for "where\'s my order?", "how long is the delivery?" or "when do the beans arrive?". Pass the purchase in their words, or null for their latest orders. It changes nothing.',
  inputSchema: z.object({
    purchase: z
      .string()
      .max(120)
      .nullable()
      .describe("Which purchase, in the user's words or its title, or null for their latest orders"),
  }),
  async run({ purchase }) {
    // Newest first, so "the beans" means the beans you bought last.
    const bought = (await database.decisions.listDecisions())
      .filter((d) => d.kind === "purchase" && !isSampleHistory(d))
      .filter((d) => ["auto_approved", "approved", "held", "refunded"].includes(d.outcome))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const found = purchase ? pickByTitle(bought, purchase) : null;
    const orders = purchase ? (found ? [found] : []) : bought.slice(0, 3);
    if (orders.length === 0) {
      return {
        summary: purchase
          ? `Nothing you've bought with Leash matches "${purchase}".`
          : "You haven't bought anything with Leash yet.",
      };
    }
    return {
      summary: orders.map((order) => `${order.title}: ${describeDelivery(order)}`).join("\n"),
      data: orders.map((order) => ({ title: order.title, outcome: order.outcome, shipping: order.shipping })),
    };
  },
});
