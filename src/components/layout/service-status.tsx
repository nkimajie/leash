"use client";

// Shows which services are live and which run in mock mode, so anyone testing the app knows.

import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import type { ServiceModes } from "@/schemas";
import { fetchServiceModes, resetDemo } from "@/lib/api-client";
import { classNames } from "@/lib/format";

export function ServiceStatus() {
  const [modes, setModes] = useState<ServiceModes | null>(null);

  useEffect(() => {
    fetchServiceModes()
      .then(setModes)
      .catch(() => {});
  }, []);

  if (!modes) return null;

  const services = [
    { name: "PayPal", mode: modes.payments, live: modes.payments !== "mock" },
    { name: "AI agent", mode: modes.assistant, live: modes.assistant !== "mock" },
    { name: "Product search", mode: modes.productSearch, live: modes.productSearch !== "mock" },
    { name: "Database", mode: modes.database, live: modes.database !== "memory" },
  ];

  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <div className="font-medium text-stone-500">Services</div>
      {services.map((service) => (
        <div
          key={service.name}
          className="flex items-center justify-between gap-2"
          title={service.live ? "Live" : "Mock mode: no keys set"}
        >
          <span className="text-stone-600">{service.name}</span>
          <span
            className={classNames("flex items-center gap-1.5", service.live ? "text-emerald-700" : "text-stone-400")}
          >
            <span
              className={classNames("h-1.5 w-1.5 rounded-full", service.live ? "bg-emerald-500" : "bg-stone-300")}
            />
            {service.mode}
          </span>
        </div>
      ))}
      {modes.forceDeclinedPayments && (
        <div className="mt-1 rounded-md bg-rose-50 px-2 py-1 text-rose-700">Decline test is on</div>
      )}
      {modes.demoMode && <ResetDemoButton />}
    </div>
  );
}

/** Demo mode: everyone shares one account, so anyone can start fresh. */
function ResetDemoButton() {
  const [isResetting, setIsResetting] = useState(false);
  return (
    <button
      type="button"
      disabled={isResetting}
      onClick={async () => {
        if (!window.confirm("Put everything back to the sample data? Your PayPal connection stays.")) return;
        setIsResetting(true);
        await resetDemo().catch(() => {});
        window.location.reload();
      }}
      className="mt-2 flex items-center justify-center gap-1.5 rounded-md bg-stone-100 px-2 py-1.5 text-stone-600 transition hover:bg-stone-200 hover:text-stone-900"
    >
      <RotateCcw className="h-3 w-3" />
      {isResetting ? "Resetting…" : "Reset demo"}
    </button>
  );
}
