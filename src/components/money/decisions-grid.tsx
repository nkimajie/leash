"use client";

// Recent activity on Money: an AG Grid table styled as a list of receipts.
// What AG Grid does here:
//   - the view (from a question you asked, e.g. "held payments over $20, biggest first") is an
//     external filter plus a column sort; the search words are its quick filter
//   - rows update live, and the money column flashes when a payment's outcome changes
//   - the pinned bottom row adds up exactly the rows you can see

import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type IRowNode,
  type RowClassParams,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isSampleHistory, type Decision, type GridView } from "@/schemas";
import { OutcomeStamp } from "@/components/ui/stamp";
import { classNames, formatMoney, formatReceiptTime, formatShortMoney } from "@/lib/format";
import { OUTCOME_STYLE, RULE_LABEL, paypalStatusInWords } from "@/lib/labels";

ModuleRegistry.registerModules([AllCommunityModule]);

// The design system's paper and ink: no header, no lines, receipts on white.
const gridTheme = themeQuartz.withParams({
  accentColor: "#1552f0",
  backgroundColor: "#ffffff",
  foregroundColor: "#14130f",
  borderColor: "#e4e0d6",
  fontFamily: "inherit",
  fontSize: 16,
  headerHeight: 0,
  wrapperBorder: false,
  rowBorder: false,
  columnBorder: false,
  headerRowBorder: false,
  cellHorizontalPadding: 0,
  rowHoverColor: "#f7f5f0",
  selectedRowBackgroundColor: "#eaf0ff",
  valueChangeValueHighlightBackgroundColor: "#eaf0ff",
});

const PAID: Decision["outcome"][] = ["auto_approved", "approved"];

/** The row the grid pins to the bottom: totals for the rows on screen. */
type TotalsRow = { id: string; shown: number; paid: number; reserved: number };

export function DecisionsGrid({
  decisions,
  view,
  selectedId,
  onSelect,
}: {
  decisions: Decision[];
  view: GridView | null;
  selectedId: string | null;
  onSelect: (decision: Decision) => void;
}) {
  const gridRef = useRef<AgGridReact<Decision>>(null);
  const [totals, setTotals] = useState<TotalsRow>({ id: "totals", shown: 0, paid: 0, reserved: 0 });
  // Wide screens put the full stamp beside the amount; phones stack a compact one under it.
  const [isWide] = useState(() => window.matchMedia("(min-width: 640px)").matches);

  // Everything in the view except the search words is an AG Grid "external filter".
  const isExternalFilterPresent = useCallback(() => view !== null, [view]);
  const doesExternalFilterPass = useCallback((node: IRowNode<Decision>) => fitsView(node.data, view), [view]);

  // Apply the view whenever it changes: refilter, then sort the way it asks.
  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    api.onFilterChanged();
    api.applyColumnState({
      state: [{ colId: view?.sortBy ?? "createdAt", sort: view?.sortDirection ?? "desc" }],
      defaultState: { sort: null },
    });
  }, [view]);

  /** Recount the totals row from the rows that survived the filters. */
  const countVisibleRows = useCallback((api: GridApi<Decision>) => {
    const next: TotalsRow = { id: "totals", shown: 0, paid: 0, reserved: 0 };
    api.forEachNodeAfterFilter((node) => {
      if (!node.data) return;
      next.shown++;
      if (isSampleHistory(node.data)) return; // never sent to PayPal, so not in the money totals
      if (PAID.includes(node.data.outcome)) next.paid += node.data.amount;
      if (node.data.outcome === "held") next.reserved += node.data.amount;
    });
    // Only update when the numbers change: a new totals row makes the grid update again.
    setTotals((current) =>
      current.shown === next.shown && current.paid === next.paid && current.reserved === next.reserved ? current : next,
    );
  }, []);

  const columns = useMemo<ColDef<Decision>[]>(
    () => [
      { field: "createdAt", hide: true, sort: "desc" }, // sorting only: the time shows under the title
      {
        colId: "receipt",
        flex: 1,
        minWidth: 160,
        cellRenderer: (p: ICellRendererParams<Decision>) =>
          p.node.rowPinned ? (
            <TotalsLabel totals={p.data as unknown as TotalsRow} />
          ) : p.data ? (
            <WhatAndWhen decision={p.data} />
          ) : null,
        tooltipValueGetter: (p) => p.data?.aiReasoning,
        getQuickFilterText: (p) =>
          `${p.data?.title} ${p.data?.counterparty} ${p.data?.category ?? ""} ${p.data?.aiReasoning} ${
            p.data
              ? `${OUTCOME_STYLE[p.data.outcome].label} ${RULE_LABEL[p.data.ruleHit]} ${paypalStatusInWords(p.data)}`
              : ""
          }`,
      },
      {
        field: "amount",
        width: isWide ? 400 : 128,
        // Flash when the outcome changes (held → paid), not just the amount.
        valueGetter: (p) => (p.data ? `${p.data.amount}|${p.data.outcome}` : ""),
        comparator: (_a, _b, nodeA, nodeB) => (nodeA.data?.amount ?? 0) - (nodeB.data?.amount ?? 0),
        enableCellChangeFlash: true,
        cellRenderer: (p: ICellRendererParams<Decision>) =>
          p.data && !p.node.rowPinned ? <MoneyAndStamp decision={p.data} wide={isWide} /> : null,
      },
    ],
    [isWide],
  );

  const getRowClass = useCallback(
    (p: RowClassParams<Decision>) => (p.data?.id === selectedId ? "!bg-leash-wash" : undefined),
    [selectedId],
  );
  useEffect(() => {
    gridRef.current?.api?.redrawRows();
  }, [selectedId]);

  return (
    <AgGridReact<Decision>
      ref={gridRef}
      theme={gridTheme}
      domLayout="autoHeight"
      rowData={decisions}
      columnDefs={columns}
      defaultColDef={{ sortable: true, suppressMovable: true }}
      rowHeight={isWide ? 84 : 92}
      getRowId={(p) => p.data.id}
      quickFilterText={view?.searchText ?? ""}
      isExternalFilterPresent={isExternalFilterPresent}
      doesExternalFilterPass={doesExternalFilterPass}
      onModelUpdated={(event) => countVisibleRows(event.api)}
      pinnedBottomRowData={[totals]}
      getRowClass={getRowClass}
      rowClass="cursor-pointer"
      onRowClicked={(event) => event.data && !event.node.rowPinned && onSelect(event.data)}
      cellFlashDuration={1500}
      tooltipShowDelay={500}
      overlayNoRowsTemplate="Nothing matches. Ask something else, or close the filter."
      animateRows
    />
  );
}

/** Does this row fit the outcome, kind, amount and date parts of the view? */
function fitsView(decision: Decision | undefined, view: GridView | null): boolean {
  if (!decision || !view) return true;
  if (view.outcomes && !view.outcomes.includes(decision.outcome)) return false;
  if (view.kind && decision.kind !== view.kind) return false;
  if (view.minAmount !== null && decision.amount < view.minAmount) return false;
  if (view.maxAmount !== null && decision.amount > view.maxAmount) return false;
  if (view.sinceDays !== null) {
    const oldest = Date.now() - view.sinceDays * 24 * 60 * 60 * 1000;
    if (new Date(decision.createdAt).getTime() < oldest) return false;
  }
  return true;
}

function WhatAndWhen({ decision }: { decision: Decision }) {
  const where = decision.kind === "purchase" ? `${decision.counterparty} · ` : "";
  return (
    <div className="flex h-full min-w-0 flex-col justify-center gap-1 pr-4 leading-tight">
      <span className="truncate text-base sm:text-lg">{decision.title}</span>
      <span className="truncate text-xs text-ink-soft sm:text-sm">
        {where}
        {formatReceiptTime(decision.createdAt)}
        {isSampleHistory(decision) && " · sample"}
      </span>
    </div>
  );
}

function MoneyAndStamp({ decision, wide }: { decision: Decision; wide: boolean }) {
  const amount = (
    <span
      className={classNames(
        "font-mono text-lg tabular-nums",
        !wide && "text-xl font-medium",
        decision.outcome === "denied" && "line-through",
      )}
    >
      {formatMoney(decision.amount)}
    </span>
  );
  return wide ? (
    <div className="flex h-full items-center justify-end gap-8">
      {amount}
      <OutcomeStamp outcome={decision.outcome} />
    </div>
  ) : (
    <div className="flex h-full flex-col items-end justify-center gap-2 leading-none">
      {amount}
      <OutcomeStamp outcome={decision.outcome} size="compact" />
    </div>
  );
}

function TotalsLabel({ totals }: { totals: TotalsRow }) {
  return (
    <span className="flex h-full items-center font-mono text-xs text-ink-soft">
      {totals.shown} shown · {formatShortMoney(totals.paid)} paid · {formatShortMoney(totals.reserved)} reserved
    </span>
  );
}
