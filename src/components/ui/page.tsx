import type { ReactNode } from "react";
import { classNames } from "@/lib/format";

/** The space every page sits in: 20 px margins on phones, 40 px on desktop. Ask uses the narrow column. */
export function Page({ narrow = false, children }: { narrow?: boolean; children: ReactNode }) {
  return (
    <div
      className={classNames(
        "mx-auto flex w-full flex-col gap-6 px-5 pt-2 pb-8 lg:gap-8 lg:px-10 lg:pt-12 lg:pb-12",
        narrow ? "max-w-[848px]" : "max-w-[1208px]",
      )}
    >
      {children}
    </div>
  );
}
