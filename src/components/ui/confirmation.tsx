"use client";

// A small "done" moment after saving something: a lesson, a new limit, your preferences.
// Never used for a payment outcome: those always show the amount and its stamp.

import { Button } from "./button";
import { Illustration, type IllustrationName } from "./illustration";
import { Sheet } from "./sheet";

export function Confirmation({
  open,
  onClose,
  illustration,
  title,
  text,
}: {
  open: boolean;
  onClose: () => void;
  illustration: IllustrationName;
  title: string;
  text: string;
}) {
  return (
    <Sheet open={open} onClose={onClose} close="none" white>
      <div className="grid place-items-center rounded-2xl border border-leash-rim bg-leash-wash py-2">
        <Illustration name={illustration} className="w-40" />
      </div>
      <h2 className="mt-5 text-[28px] leading-[34px] font-semibold tracking-[-0.03em]">{title}</h2>
      <p className="mt-3 text-sm text-ink-soft">{text}</p>
      <Button className="mt-6 w-full" onClick={onClose}>
        Done
      </Button>
    </Sheet>
  );
}
