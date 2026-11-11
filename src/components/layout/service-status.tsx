"use client";

// Shows which services are live and which run in mock mode, so anyone testing the app knows.

import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import type { ServiceModes } from "@/schemas";
import { Button } from "@/components/ui/button";
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
    <div className="flex flex-col gap-4">
      <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-white px-4">
        {services.map((service) => (
          <div
            key={service.name}
            className="flex items-center justify-between gap-2 py-3 text-sm"
            title={service.live ? "Live" : "Mock mode: no keys set"}
          >
            <span>{service.name}</span>
            <span className={classNames("font-mono text-xs", service.live ? "text-paid" : "text-ink-soft")}>
              {service.mode}
            </span>
          </div>
        ))}
      </div>
      {modes.forceDeclinedPayments && (
        <p className="rounded-xl bg-failed-wash px-3 py-2 text-sm text-failed">The decline test is on.</p>
      )}
      {modes.demoMode && <ResetDemoButton />}
    </div>
  );
}

/** Demo mode: everyone shares one account, so anyone can start fresh. */
function ResetDemoButton() {
  const [isResetting, setIsResetting] = useState(false);
  return (
    <Button
      variant="secondary"
      disabled={isResetting}
      onClick={async () => {
        if (!window.confirm("Put everything back to the sample data? Your PayPal connection stays.")) return;
        setIsResetting(true);
        await resetDemo().catch(() => {});
        window.location.reload();
      }}
    >
      <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
      {isResetting ? "Resetting…" : "Reset demo"}
    </Button>
  );
}
