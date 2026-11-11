import "server-only";

import { z } from "zod";
import { LEASH_PAGES, type LeashPage } from "@/schemas";
import { defineTool } from "./define-tool";

const PAGES: Record<LeashPage, { path: string; label: string }> = {
  ask: { path: "/", label: "Ask" },
  money: { path: "/money", label: "your money" },
  limits: { path: "/leash", label: "your limits" },
  people: { path: "/leash/people", label: "the people you pay" },
  restocks: { path: "/leash/restocks", label: "your restocks" },
  paypal: { path: "/leash/paypal", label: "your PayPal" },
  twin: { path: "/twin", label: "your twin" },
};

export const openPageTool = defineTool({
  name: "open_page",
  description:
    "Open one of Leash's pages when the user asks to go there: Money (every purchase and payment), their limits (spending rules), the people they pay, restocks, their PayPal account, or their twin.",
  inputSchema: z.object({ page: z.enum(LEASH_PAGES) }),
  async run({ page }) {
    return { summary: `Opening ${PAGES[page].label}.`, openPage: PAGES[page] };
  },
});
