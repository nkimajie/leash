import "server-only";

import { z } from "zod";
import { LEASH_PAGES, type LeashPage } from "@/schemas";
import { defineTool } from "./define-tool";

const PAGES: Record<LeashPage, { path: string; label: string }> = {
  assistant: { path: "/", label: "the assistant" },
  "control-room": { path: "/control-room", label: "the control room" },
  people: { path: "/people", label: "your people" },
  twin: { path: "/twin", label: "your twin" },
  restocks: { path: "/restocks", label: "your restocks" },
  rules: { path: "/rules", label: "your rules" },
  connect: { path: "/connect", label: "Connect PayPal" },
};

export const openPageTool = defineTool({
  name: "open_page",
  description:
    "Open one of Leash's pages when the user asks to go there: the control room (every purchase and payment), people, their twin, restocks, rules or Connect PayPal.",
  inputSchema: z.object({ page: z.enum(LEASH_PAGES) }),
  async run({ page }) {
    return { summary: `Opening ${PAGES[page].label}.`, openPage: PAGES[page] };
  },
});
