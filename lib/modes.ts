// Which services run for real and which are mocked, based on which keys are set.
// Server-only (reads secrets' presence, never their values).

import { channel3IsMock } from "./channel3";
import { forceDecline, paypalIsMock } from "./paypal";

export type Modes = {
  paypal: "sandbox" | "mock";
  agent: "claude" | "mock";
  search: "channel3" | "mock";
  database: "supabase" | "memory";
  forceDecline: boolean;
};

export function getModes(): Modes {
  return {
    paypal: paypalIsMock ? "mock" : "sandbox",
    agent: process.env.ANTHROPIC_API_KEY ? "claude" : "mock",
    search: channel3IsMock ? "mock" : "channel3",
    database: "memory", // TODO(step 6): "supabase" when its keys are set
    forceDecline: forceDecline(),
  };
}
