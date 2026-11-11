"use client";

// Bottom sheets on phones, centred popovers on desktop: notifications, a receipt, "Why not?",
// help. Built on <dialog>, so Escape, focus and screen readers work for free.

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { classNames } from "@/lib/format";

export function Sheet({
  open,
  onClose,
  title,
  description,
  close = "icon",
  white = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: ReactNode;
  /** An × button (notifications, profile), or a blue "Close" link (receipt, filter). */
  close?: "icon" | "text" | "none";
  /** Small popovers are white; sheets are paper. */
  white?: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    if (!open && element?.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      // A click on the dimmed backdrop lands on the <dialog> itself.
      onClick={(event) => event.target === dialog.current && onClose()}
      aria-label={title}
      className={classNames(
        "m-0 mt-auto max-h-[90dvh] w-full max-w-none rounded-t-[28px] p-0 text-ink backdrop:bg-ink/40 sm:m-auto sm:w-[420px] sm:rounded-[28px]",
        white ? "bg-white" : "bg-paper",
      )}
    >
      {open && (
        <div className="px-5 pt-3 pb-8 sm:px-6 sm:pt-6">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-hairline sm:hidden" aria-hidden />
          {(title || close !== "none") && (
            <div className="mb-3 flex items-start justify-between gap-4">
              {title && <h2 className="text-[28px] leading-[34px] font-semibold tracking-[-0.03em]">{title}</h2>}
              {close === "icon" && (
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-hairline bg-white"
                >
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </button>
              )}
              {close === "text" && (
                <button onClick={onClose} className="py-1 text-base text-leash">
                  Close
                </button>
              )}
            </div>
          )}
          {description && <p className="mb-5 text-base text-ink-soft">{description}</p>}
          {children}
        </div>
      )}
    </dialog>
  );
}
