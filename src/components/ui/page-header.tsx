import type { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{title}</h1>
        <p className="mt-1 text-sm text-stone-500">{description}</p>
      </div>
      {action}
    </div>
  );
}
