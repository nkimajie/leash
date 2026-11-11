import type { HTMLAttributes, ReactNode } from "react";
import { classNames } from "@/lib/format";

/** A clear section card: white paper with a hairline edge. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={classNames("rounded-[20px] border border-hairline bg-white p-4 sm:p-6", className)} />
  );
}

/** A quieter blue card for a moment of reassurance, usually with an illustration. */
export function WashCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={classNames("rounded-[20px] border border-leash-rim bg-leash-wash p-4 sm:p-6", className)}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl leading-[26px] font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}
