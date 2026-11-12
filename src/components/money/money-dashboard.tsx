"use client";

// The dashboard on Money: AG Studio, fed with your decisions as they happen.
// What AG Studio does here:
//   - totals, charts and a table, all from one flat table of decisions (./dashboard-data.ts)
//   - click a bar or a row and every other widget filters to match (cross-filtering)
//   - the table shows the same stamps as your receipts (a custom cell renderer)
//   - "Customise" opens Studio's drag-and-drop editor, to change, add or remove widgets
// Studio passes its Enterprise grid and chart modules to its own widgets only, so the receipts
// grid stays AG Grid Community.

import type { AgStudioMode, AgWidgetField } from "ag-studio";
import { AgStudio, AgStudioProvider, createWidgets, type AgWidgetCustomCellRendererProps } from "ag-studio-react";
import { useMemo } from "react";
import type { Decision } from "@/schemas";
import { Stamp } from "@/components/ui/stamp";
import { OUTCOME_STYLE } from "@/lib/labels";
import { dashboardData, toDashboardRow } from "./dashboard-data";
import { dashboardReport, phoneLayout } from "./dashboard-report";
import { dashboardTheme } from "./dashboard-theme";

// Optional. Without a key everything works, with a watermark on deployed sites.
const LICENSE_KEY = process.env.NEXT_PUBLIC_AG_GRID_LICENSE_KEY || undefined;

/** "Paid", "Blocked"…: the stamp from the receipts, in the table's "What happened" column. */
function StampCell({ value }: AgWidgetCustomCellRendererProps) {
  const tone = Object.values(OUTCOME_STYLE).find((style) => style.label === value)?.tone;
  return tone ? (
    <Stamp tone={tone} size="compact">
      {value}
    </Stamp>
  ) : null;
}

const widgets = createWidgets({
  overrides: [
    {
      id: "grid",
      options: {
        createCellRenderer: (field: AgWidgetField) => (field.fieldId === "decisions.stamp" ? StampCell : undefined),
      },
    },
  ],
});

export function MoneyDashboard({ decisions, mode }: { decisions: Decision[]; mode: AgStudioMode }) {
  // Decisions are reloaded every few seconds. Only give Studio new data when a row really changed,
  // so the charts don't redraw for nothing.
  const rowsJson = JSON.stringify(decisions.map(toDashboardRow));
  const data = useMemo(() => dashboardData(JSON.parse(rowsJson)), [rowsJson]);

  return (
    <AgStudioProvider licenseKey={LICENSE_KEY}>
      <AgStudio
        style={{ height: "100%", width: "100%" }}
        theme={dashboardTheme}
        data={data}
        widgets={widgets}
        initialState={dashboardReport}
        mode={mode}
        responsiveLayoutBreakpoints={[phoneLayout]}
        // Viewing: just the dashboard. Customising: Studio's own filters, widget and data panels.
        panels={{ view: { left: [], right: [] }, edit: { right: ["filters", "edit", "data"] } }}
      />
    </AgStudioProvider>
  );
}
