// Leash's ribbon illustrations (public/illustrations, exported from the Figma design system).
// One per quiet moment, never behind an amount, a receipt or an Approve decision.

import Image from "next/image";
import { classNames } from "@/lib/format";

const SIZES = {
  "held-loop": [208, 189], // welcome moments
  "bounded-receipt": [218, 176], // room to act, with a clear boundary
  "learning-pair": [239, 177], // twin introductions
  // The action motifs share one 320 × 240 frame:
  "boundary-held": [320, 240], // limits, blocked explanations, the Ask welcome
  waiting: [320, 240], // approval reminders
  released: [320, 240], // you weren't charged
  "all-set": [320, 240], // all paid, settings saved
  "lesson-saved": [320, 240], // your twin learned something
} as const;

export type IllustrationName = keyof typeof SIZES;

export function Illustration({
  name,
  className,
  eager = false,
}: {
  name: IllustrationName;
  className?: string;
  /** The first thing on screen (e.g. the welcome card): load it straight away. */
  eager?: boolean;
}) {
  const [width, height] = SIZES[name];
  return (
    <Image
      src={`/illustrations/${name}.svg`}
      alt=""
      width={width}
      height={height}
      unoptimized
      loading={eager ? "eager" : undefined}
      className={classNames("h-auto select-none", className)}
    />
  );
}
