// The first visit: what Leash is, then sign in with PayPal and set your first limits.
// Lives outside the dashboard, so it has no sidebar or tabs.

import type { Metadata } from "next";
import { Suspense } from "react";
import { WelcomeSteps } from "@/components/welcome/welcome-steps";

export const metadata: Metadata = { title: "Welcome" };

export default function WelcomePage() {
  return (
    <Suspense>
      <WelcomeSteps />
    </Suspense>
  );
}
