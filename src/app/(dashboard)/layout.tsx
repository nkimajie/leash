// Shared frame (sidebar + navigation) for every page except the phone approval screen.

import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
