"use client";

// The AG Grid table inside the control room.
// The view (filters + sorting) comes from the filter buttons or from a question you asked;
// the pinned bottom row adds up exactly the rows you can see.

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
import { UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isSampleHistory, type Decision, type GridView } from "@/schemas";
import { formatMoney, formatWhen } from "@/lib/format";
import { OUTCOME_STYLE, RULE_LABEL, paypalStatusInWords } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { OutcomeBadge } from "@/components/ui/outcome-badge";
import { ProductPhoto } from "@/components/ui/product-photo";

ModuleRegistry.registerModules([AllCommunityModule]);

const gridTheme = themeQuartz.withParams({
  accentColor: "#1c1917",
  fontFamily: "inherit",
  fontSize: 13,
  headerFontWeight: 600,
  headerTextColor: "#57534e",
  headerBackgroundColor: "#fafaf9",
  rowHoverColor: "#f5f5f4",
  borderColor: "#e7e5e4",
  wrapperBorderRadius: 16,
  cellHorizontalPadding: 14,
});

export type DecisionAction = "approve" | "deny" | "refund";

type GridProps = {
  decisions: Decision[];
  view: GridView | null;
  selectedId: string | null;
  onSelect: (decision: Decision) => void;
  onAction: (action: DecisionAction, decision: Decision) => Promise<void>;
};

const PAID: Decision["outcome"][] = ["auto_approved", "approved"];

/** The row the grid pins to the bottom: totals for the rows on screen. */
type TotalsRow = { id: string; shown: number; paid: number; reserved: number };

export function DecisionsGrid({ decisions, view, selectedId, onSelect, onAction }: GridProps) {
  const gridRef = useRef<AgGridReact<Decision>>(null);
  const [totals, setTotals] = useState<TotalsRow>({ id: "totals", shown: 0, paid: 0, reserved: 0 });

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
      {
        field: "createdAt",
        headerName: "When",
        width: 140,
        sort: "desc",
        valueFormatter: (p) => (p.value ? formatWhen(p.value) : ""),
        cellClass: "text-stone-500",
      },
      {
        field: "title",
        headerName: "What & why",
        flex: 1,
        minWidth: 300,
        cellRenderer: (p: ICellRendererParams<Decision>) =>
          p.node.rowPinned ? (
            <TotalsLabel totals={p.data as unknown as TotalsRow} />
          ) : p.data ? (
            <WhatAndWhy decision={p.data} />
          ) : null,
        tooltipValueGetter: (p) => p.data?.aiReasoning,
        getQuickFilterText: (p) => `${p.data?.title} ${p.data?.category ?? ""} ${p.data?.aiReasoning}`,
      },
      { field: "counterparty", headerName: "To", width: 170, tooltipField: "counterparty" },
      {
        field: "amount",
        headerName: "Amount",
        width: 100,
        type: "rightAligned",
        valueFormatter: (p) => (p.node?.rowPinned ? "" : p.value == null ? "" : formatMoney(p.value)),
        cellClass: "tabular-nums font-medium",
      },
      {
        field: "outcome",
        headerName: "Outcome & rule",
        width: 180,
        enableCellChangeFlash: true,
        cellRenderer: (p: ICellRendererParams<Decision>) =>
          p.data && !p.node.rowPinned ? (
            <div className="flex flex-col items-start gap-1 leading-none">
              <OutcomeBadge outcome={p.data.outcome} />
              <span className="text-[11px] text-stone-500">{RULE_LABEL[p.data.ruleHit]}</span>
            </div>
          ) : null,
        getQuickFilterText: (p) =>
          p.data ? `${OUTCOME_STYLE[p.data.outcome].label} ${RULE_LABEL[p.data.ruleHit]}` : "",
      },
      {
        field: "paypal.status",
        headerName: "PayPal",
        width: 160,
        enableCellChangeFlash: true,
        cellRenderer: (p: ICellRendererParams<Decision>) =>
          p.data && !p.node.rowPinned ? (
            <div className="flex flex-col gap-1 leading-none">
              <span className="text-stone-800">{paypalStatusInWords(p.data)}</span>
              {p.data.paypal.status && !isSampleHistory(p.data) && (
                <span className="truncate font-mono text-[10px] text-stone-400">{p.data.paypal.status}</span>
              )}
              {p.data.paypal.debugId && (
                <span className="truncate font-mono text-[10px] text-rose-700">debug_id {p.data.paypal.debugId}</span>
              )}
            </div>
          ) : null,
        getQuickFilterText: (p) => (p.data ? paypalStatusInWords(p.data) : ""),
      },
      {
        colId: "actions",
        headerName: "",
        width: 150,
        pinned: "right",
        sortable: false,
        cellRenderer: (p: ICellRendererParams<Decision>) =>
          p.data && !p.node.rowPinned ? <ActionButtons decision={p.data} onAction={onAction} /> : null,
      },
    ],
    [onAction],
  );

  const getRowClass = useCallback(
    (p: RowClassParams<Decision>) => {
      if (p.node.rowPinned) return "bg-stone-50";
      if (p.data?.id === selectedId) return "bg-violet-50";
      if (p.data?.outcome === "held") return "bg-amber-50/70";
      return undefined;
    },
    [selectedId],
  );
  useEffect(() => {
    gridRef.current?.api?.redrawRows();
  }, [selectedId]);

  return (
    <div className="h-[620px] w-full">
      <AgGridReact<Decision>
        ref={gridRef}
        theme={gridTheme}
        rowData={decisions}
        columnDefs={columns}
        defaultColDef={{ sortable: true, resizable: true }}
        rowHeight={68}
        getRowId={(p) => p.data.id}
        quickFilterText={view?.searchText ?? ""}
        isExternalFilterPresent={isExternalFilterPresent}
        doesExternalFilterPass={doesExternalFilterPass}
        onModelUpdated={(event) => countVisibleRows(event.api)}
        pinnedBottomRowData={[totals]}
        getRowClass={getRowClass}
        onRowClicked={(event) => event.data && !event.node.rowPinned && onSelect(event.data)}
        cellFlashDuration={1500}
        tooltipShowDelay={400}
        overlayNoRowsTemplate="Nothing matches. Ask something else, or clear the view."
        animateRows
      />
    </div>
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

function TotalsLabel({ totals }: { totals: TotalsRow }) {
  return (
    <span className="text-sm">
      <span className="font-semibold">{totals.shown} shown</span>
      <span className="text-stone-500">
        {" "}
        · {formatMoney(totals.paid)} paid · {formatMoney(totals.reserved)} reserved
      </span>
    </span>
  );
}

function WhatAndWhy({ decision }: { decision: Decision }) {
  return (
    <div className="flex h-full min-w-0 items-center gap-3">
      {decision.kind === "payment" ? (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">
          <UserRound className="h-5 w-5" />
        </span>
      ) : (
        <ProductPhoto decision={decision} />
      )}
      <div className="flex min-w-0 flex-col gap-0.5 leading-snug">
        <span className="truncate font-medium text-stone-900">{decision.title}</span>
        <span className="line-clamp-2 whitespace-normal text-xs text-stone-500">{decision.aiReasoning}</span>
      </div>
    </div>
  );
}

function ActionButtons({ decision, onAction }: { decision: Decision; onAction: GridProps["onAction"] }) {
  const [isBusy, setIsBusy] = useState(false);
  const run = async (action: DecisionAction) => {
    setIsBusy(true);
    await onAction(action, decision);
    setIsBusy(false);
  };

  if (isSampleHistory(decision)) return null;
  if (decision.outcome === "held") {
    return (
      <div className="flex h-full items-center gap-1.5">
        <Button size="sm" variant="approve" disabled={isBusy} onClick={() => run("approve")}>
          Approve
        </Button>
        <Button size="sm" variant="secondary" disabled={isBusy} onClick={() => run("deny")}>
          Deny
        </Button>
      </div>
    );
  }
  // Money sent on to a person can't be pulled back, so only purchases can be refunded.
  if (decision.kind === "purchase" && (decision.outcome === "auto_approved" || decision.outcome === "approved")) {
    return (
      <div className="flex h-full items-center">
        <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => run("refund")}>
          Refund
        </Button>
      </div>
    );
  }
  return null;
}
