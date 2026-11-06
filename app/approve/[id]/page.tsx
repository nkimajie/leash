import type { Metadata } from "next";
import { Suspense } from "react";
import { ApproveCard } from "@/components/ApproveCard";

export const metadata: Metadata = { title: "Approve purchase · Leash" };

export default function ApprovePage({ params }: PageProps<"/approve/[id]">) {
  return (
    <Suspense>
      <ApproveCard params={params} />
    </Suspense>
  );
}
