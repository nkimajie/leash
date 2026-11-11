"use client";

// The bell: what needs your okay, the latest thing that happened to your money, and (if you want)
// the latest thing your twin learned.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Preference } from "@/schemas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReceiptRow } from "@/components/ui/receipt-row";
import { Sheet } from "@/components/ui/sheet";
import { fetchPreferences } from "@/lib/api-client";
import { OUTCOME_SENTENCE } from "@/lib/labels";
import { loadNotificationPreferences } from "@/lib/notification-preferences";
import { useLiveDecisions } from "@/lib/use-live-decisions";

const COUNT_WORDS = ["Nothing", "One thing", "Two things", "Three things", "Four things", "Five things"];

export function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { decisions } = useLiveDecisions();
  const [lesson, setLesson] = useState<Preference | null>(null);
  const show = open ? loadNotificationPreferences() : null;

  useEffect(() => {
    if (open && show?.twinLessons) fetchPreferences().then((lessons) => setLesson(lessons.at(-1) ?? null), () => {});
  }, [open, show?.twinLessons]);

  const waiting = decisions.filter((d) => d.outcome === "held").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const latest = decisions.filter((d) => d.outcome !== "held").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const newest = waiting.at(-1);
  const summary = `${COUNT_WORDS[waiting.length] ?? `${waiting.length} things`} ${waiting.length === 1 ? "needs" : "need"} your okay.`;

  return (
    <Sheet open={open} onClose={onClose} title="Notifications" description={summary}>
      <div className="flex flex-col gap-5">
        {show?.needsOkay && waiting.length > 0 && (
          <>
            <Card className="py-2 sm:py-3">
              <h3 className="pt-2 text-xl font-semibold">Needs your okay</h3>
              <div className="divide-y divide-hairline">
                {waiting.map((decision) => (
                  <ReceiptRow key={decision.id} decision={decision} />
                ))}
              </div>
            </Card>
            {newest && (
              <Button onClick={() => router.push(`/approve/${newest.id}`)}>Review {newest.title.toLowerCase()}</Button>
            )}
          </>
        )}
        {show?.paymentUpdates && latest && (
          <Card className="py-2 sm:py-3">
            <h3 className="pt-2 text-xl font-semibold">Recent update</h3>
            <ReceiptRow decision={latest} />
            <p className="pb-2 text-sm text-ink-soft">{OUTCOME_SENTENCE[latest.outcome]}</p>
          </Card>
        )}
        {show?.twinLessons && lesson && (
          <Card>
            <h3 className="text-xl font-semibold">Your twin learned</h3>
            <p className="mt-3 text-base">→ {lesson.statement}</p>
          </Card>
        )}
      </div>
    </Sheet>
  );
}
