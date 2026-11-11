"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Confirmation } from "@/components/ui/confirmation";
import { Toggle } from "@/components/ui/form-fields";
import { Sheet } from "@/components/ui/sheet";
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notification-preferences";

const CHOICES: { key: keyof NotificationPreferences; label: string }[] = [
  { key: "needsOkay", label: "Requests that need your okay" },
  { key: "paymentUpdates", label: "Payment updates" },
  { key: "twinLessons", label: "Twin lessons" },
];

export function NotificationPreferencesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [choices, setChoices] = useState<NotificationPreferences | null>(null);
  const [saved, setSaved] = useState(false);
  const current = choices ?? (open ? loadNotificationPreferences() : null);

  const close = () => {
    setChoices(null);
    onClose();
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={close}
        close="none"
        title="Make it your kind of quiet."
        description="Choose what you'd like to hear about. Your money rules stay the same."
      >
        <div className="flex flex-col gap-4">
          {current &&
            CHOICES.map(({ key, label }) => (
              <div
                key={key}
                className="flex h-[60px] items-center justify-between rounded-2xl border border-hairline bg-white px-4"
              >
                <span className="text-base font-medium">{label}</span>
                <Toggle checked={current[key]} label={label} onChange={(on) => setChoices({ ...current, [key]: on })} />
              </div>
            ))}
          <Button
            onClick={() => {
              if (current) saveNotificationPreferences(current);
              close();
              setSaved(true);
            }}
          >
            Save preferences
          </Button>
          <Button variant="text" onClick={close}>
            Cancel
          </Button>
        </div>
      </Sheet>
      <Confirmation
        open={saved}
        onClose={() => setSaved(false)}
        illustration="all-set"
        title="A little quieter. Just for you."
        text="Your notification preferences are saved."
      />
    </>
  );
}
