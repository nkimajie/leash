import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.03em] text-ink">{title}</h1>
        {description && <p className="mt-3 text-base text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}
