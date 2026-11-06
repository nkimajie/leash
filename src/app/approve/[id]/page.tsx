// Phone-sized approve / deny screen. Lives outside the dashboard so it has no sidebar.

import type { Metadata } from "next";
import { Suspense } from "react";
import { ApprovalScreen } from "@/components/approvals/approval-screen";

export const metadata: Metadata = { title: "Approve" };

export default function ApprovePage({ params }: PageProps<"/approve/[id]">) {
  return (
    <Suspense>
      <ApprovalScreen params={params} />
    </Suspense>
  );
}
