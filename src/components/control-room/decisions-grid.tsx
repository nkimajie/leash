"use client";

// The AG Grid table inside the control room.

import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
  type IRowNode,
  type RowClassParams,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { ShoppingBag, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Decision, Outcome } from "@/schemas";
import { formatMoney, formatWhen } from "@/lib/format";
import { OUTCOME_STYLE, RULE_LABEL } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { OutcomeBadge } from "@/components/ui/outcome-badge";

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
  searchText: string;
  visibleOutcomes: Outcome[] | null;
  totalPaid: number;
  onAction: (action: DecisionAction, decision: Decision) => Promise<void>;
};

export function DecisionsGrid({ decisions, searchText, visibleOutcomes, totalPaid, onAction }: GridProps) {
  const gridRef = useRef<AgGridReact<Decision>>(null);

  // Outcome filter buttons are an AG Grid "external filter".
  const isExternalFilterPresent = useCallback(() => visibleOutcomes !== null, [visibleOutcomes]);
  const doesExternalFilterPass = useCallback(
    (node: IRowNode<Decision>) => !visibleOutcomes || (!!node.data && visibleOutcomes.includes(node.data.outcome)),
    [visibleOutcomes],
  );
  useEffect(() => {
    gridRef.current?.api?.onFilterChanged();
  }, [visibleOutcomes]);

  // A pinned row at the bottom showing money actually taken.
  const totalRow = useMemo(() => [{ id: "total-row", title: "Total paid", amount: totalPaid }], [totalPaid]);

  const columns = useMemo<ColDef<Decision>[]>(
    () => [
      {
        field: "createdAt",
        headerName: "When",
        width: 110,
        sort: "desc",
        valueFormatter: (p) => (p.value ? formatWhen(p.value) : ""),
        cellClass: "text-stone-500",
      },
      {
        field: "kind",
        headerName: "",
        width: 48,
        sortable: false,
        cellRenderer: (p: ICellRendererParams<Decision>) =>
          p.data && !p.node.rowPinned ? <KindIcon decision={p.data} /> : null,
      },
      {
        field: "title",
        headerName: "What & why",
        flex: 1,
        minWidth: 260,
        cellRenderer: (p: ICellRendererParams<Decision>) =>
          p.node.rowPinned ? (
            <span className="font-semibold">Total paid</span>
          ) : p.data ? (
            <WhatAndWhy decision={p.data} />
          ) : null,
        tooltipValueGetter: (p) => p.data?.aiReasoning,
        getQuickFilterText: (p) => `${p.data?.title} ${p.data?.aiReasoning}`,
      },
      { field: "counterparty", headerName: "To", width: 120 },
      {
        field: "amount",
        headerName: "Amount",
        width: 100,
        type: "rightAligned",
        valueFormatter: (p) => (p.value == null ? "" : formatMoney(p.value)),
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
        width: 170,
        enableCellChangeFlash: true,
        cellRenderer: (p: ICellRendererParams<Decision>) =>
          p.data && !p.node.rowPinned ? (
            <div className="flex flex-col gap-1 font-mono text-[11px] leading-none">
              <span className="text-stone-700">{p.data.paypal.status ?? "not called"}</span>
              {p.data.paypal.debugId && <span className="text-rose-700">debug_id {p.data.paypal.debugId}</span>}
            </div>
          ) : null,
      },
      {
        colId: "actions",
        headerName: "",
        width: 160,
        pinned: "right",
        sortable: false,
        cellRenderer: (p: ICellRendererParams<Decision>) =>
          p.data && !p.node.rowPinned ? <ActionButtons decision={p.data} onAction={onAction} /> : null,
      },
    ],
    [onAction],
  );

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
        quickFilterText={searchText}
        isExternalFilterPresent={isExternalFilterPresent}
        doesExternalFilterPass={doesExternalFilterPass}
        pinnedBottomRowData={totalRow}
        getRowClass={highlightRow}
        cellFlashDuration={1500}
        tooltipShowDelay={400}
        overlayNoRowsTemplate="Nothing here yet. Ask the assistant for something."
        animateRows
      />
    </div>
  );
}

function KindIcon({ decision }: { decision: Decision }) {
  return decision.kind === "payment" ? (
    <UserRound className="h-4 w-4 text-violet-600" aria-label="Payment to a person" />
  ) : (
    <ShoppingBag className="h-4 w-4 text-stone-500" aria-label="Purchase" />
  );
}

function WhatAndWhy({ decision }: { decision: Decision }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 leading-snug">
      <span className="truncate font-medium text-stone-900">{decision.title}</span>
      <span className="line-clamp-2 whitespace-normal text-xs text-stone-500">{decision.aiReasoning}</span>
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
  if (decision.outcome === "auto_approved" || decision.outcome === "approved") {
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

function highlightRow(p: RowClassParams<Decision>) {
  if (p.node.rowPinned) return "bg-stone-50";
  if (p.data?.outcome === "held") return "bg-amber-50/70";
  return undefined;
}
