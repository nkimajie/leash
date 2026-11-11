"use client";

// Settings: what you hear about, which services are live, and (in the public demo) a fresh start.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { PoweredBy, type Sponsor } from "@/components/ui/powered-by";
import { NotificationPreferencesSheet } from "./notification-preferences-sheet";
import { ServiceStatus } from "./service-status";

const SPONSORS: Sponsor[] = ["PayPal", "AG Grid", "Bryntum", "APIMatic", "Channel3", "Render"];

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [editingNotifications, setEditingNotifications] = useState(false);
  return (
    <>
      <Sheet open={open} onClose={onClose} title="Settings">
        <div className="flex flex-col gap-6">
          <section>
            <h3 className="mb-2 text-base font-medium">Notifications</h3>
            <Button variant="secondary" className="w-full" onClick={() => setEditingNotifications(true)}>
              Notification settings
            </Button>
          </section>
          <section>
            <h3 className="mb-2 text-base font-medium">Services</h3>
            <p className="mb-3 text-sm text-ink-soft">Each one runs in mock mode until its keys are set.</p>
            <ServiceStatus />
          </section>
          <section>
            <h3 className="mb-3 text-base font-medium">Built with our hackathon sponsors</h3>
            <div className="flex flex-wrap gap-1.5">
              {SPONSORS.map((sponsor) => (
                <PoweredBy key={sponsor} sponsor={sponsor} />
              ))}
            </div>
          </section>
        </div>
      </Sheet>
      <NotificationPreferencesSheet open={editingNotifications} onClose={() => setEditingNotifications(false)} />
    </>
  );
}
