import type { HTMLAttributes, ReactNode } from "react";
import { classNames } from "@/lib/format";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={classNames("rounded-2xl border border-stone-200 bg-white shadow-xs", className)} />;
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-stone-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
