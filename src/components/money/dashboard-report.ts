// The dashboard AG Studio opens with: what each widget shows and where it sits, as AG Studio report
// state. Fields ("decisions.rule") and totals ("paidTotal") come from ./dashboard-data.ts.
// Clicking a bar or a row filters every other widget (AG Studio's cross-filtering), so clicking
// "Blocked category" shows what it stopped, when, and from which shop.

import type {
  AgDefaultWidget,
  AgFilterState,
  AgPageState,
  AgReportState,
  AgResponsiveLayoutBreakpoint,
  AgWidgetLayoutState,
} from "ag-studio";
import { MONO, STAMP_INK } from "./dashboard-theme";

const field = (column: string) => ({ id: `decisions.${column}` });
const total = (column: string) => ({ id: `${column}Total` });
const title = (text: string) => ({ enabled: true, text });

/** Every money chart lists these four totals in this order, so their colours match the stamps. */
const MONEY = [total("paid"), total("reserved"), total("stopped"), total("refunded")];

/** Leaves out the rows where a money column is 0, so a chart doesn't list empty bars. */
const onlyWhereSome = (column: string): AgFilterState[] => [
  { field: field(column), model: { operator: "greaterThan", value: 0 } },
];

/** A big number: one total, in the colour of its stamp. */
function tile(text: string, column: string, color: string): AgDefaultWidget {
  return {
    type: "value",
    dataMapping: { value: [total(column)] },
    format: {
      title: { ...title(text), typography: { fontSize: 14 }, wrapping: true },
      style: { color, typography: { fontFamily: MONO, fontSize: 26 }, textAlign: "left", verticalAlign: "bottom" },
    },
  };
}

const widgets: Record<string, AgDefaultWidget> = {
  paid: tile("Paid", "paid", STAMP_INK.paid),
  reserved: tile("Waiting for you", "reserved", STAMP_INK.reserved),
  stopped: tile("Stopped by your leash", "stopped", STAMP_INK.blocked),
  refunded: tile("Refunded", "refunded", STAMP_INK.refunded),
  "by-category": {
    type: "bar-chart-grouped",
    dataMapping: { categoryKey: [field("category")], valueKey: [total("paid")] },
    sort: [{ field: total("paid"), direction: "desc" }],
    format: { title: title("Where your money went"), subtitle: title("Paid, by category") },
  },
  "by-day": {
    type: "column-chart-stacked",
    // "::day" groups by day (one bar each), rather than placing them on a continuous time axis.
    dataMapping: { categoryKey: [{ id: "decisions.day::day" }], valueKey: MONEY },
    format: {
      title: title("Day by day"),
      style: { theme: { common: { legend: { enabled: true, position: "bottom" } } } },
    },
  },
  "stopped-by-rule": {
    type: "bar-chart-stacked",
    dataMapping: { categoryKey: [field("rule")], valueKey: MONEY },
    sort: [{ field: total("stopped"), direction: "desc" }],
    format: {
      title: title("What your leash stopped"),
      subtitle: title("Blocked by a rule, or released when you said no"),
      style: { theme: { common: { legend: { enabled: false } } } },
    },
  },
  "by-who": {
    type: "bar-chart-grouped",
    dataMapping: { categoryKey: [field("where")], valueKey: [total("paid")] },
    sort: [{ field: total("paid"), direction: "desc" }],
    format: { title: title("Who you paid"), subtitle: title("Shops and people") },
  },
  decisions: {
    type: "grid",
    dataMapping: {
      cols: [field("when"), field("what"), field("stamp"), total("amount"), field("rule"), field("where")],
    },
    sort: [{ field: field("when"), direction: "desc" }],
    format: {
      title: title("Every decision behind these numbers"),
      style: { columnAutoSize: true, animateValueChanges: true, grandTotalRow: { enabled: true } },
    },
  },
};

// Where each widget sits: 24 columns across, rows of 18 px.
const at = (xTrack: number, yTrack: number, xSpan: number, ySpan: number): AgWidgetLayoutState => ({
  xTrack,
  yTrack,
  xSpan,
  ySpan,
});

const overview: AgPageState = {
  id: "overview",
  widgets,
  widgetLayout: {
    paid: at(0, 0, 6, 6),
    reserved: at(6, 0, 6, 6),
    stopped: at(12, 0, 6, 6),
    refunded: at(18, 0, 6, 6),
    "by-category": at(0, 6, 10, 18),
    "by-day": at(10, 6, 14, 18),
    "stopped-by-rule": at(0, 24, 14, 20),
    "by-who": at(14, 24, 10, 20),
    decisions: at(0, 44, 24, 22),
  },
  filter: {
    widget: {
      "by-category": onlyWhereSome("paid"),
      "by-who": onlyWhereSome("paid"),
      "stopped-by-rule": onlyWhereSome("stopped"),
    },
  },
};

export const dashboardReport: AgReportState = { selectedPageId: overview.id, pages: [overview] };

/** Phones: one column in reading order, with the small widgets (the totals) two to a row. */
export const phoneLayout: AgResponsiveLayoutBreakpoint = {
  maxWidth: 600,
  layout(widgets, { columns }) {
    const readingOrder = [...widgets].sort(
      (a, b) => a.layout.yTrack - b.layout.yTrack || a.layout.xTrack - b.layout.xTrack,
    );
    const placed = new Map<(typeof widgets)[number], AgWidgetLayoutState>();
    let x = 0;
    let y = 0;
    let rowHeight = 0;
    for (const widget of readingOrder) {
      const xSpan = widget.layout.xSpan <= columns / 4 ? columns / 2 : columns;
      if (x + xSpan > columns) {
        x = 0;
        y += rowHeight;
        rowHeight = 0;
      }
      placed.set(widget, { xTrack: x, yTrack: y, xSpan, ySpan: widget.layout.ySpan });
      x += xSpan;
      rowHeight = Math.max(rowHeight, widget.layout.ySpan);
    }
    return widgets.map((widget) => placed.get(widget)!);
  },
};
