"use client";

// The control room: every decision the agent made, live, with the rule that applied,
// the AI's reasoning and the PayPal status. Humans can approve, deny or refund from here.
// Live updates poll /api/decisions for now; step 6 swaps this for Supabase Realtime.

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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Decision, Verdict } from "@/lib/types";
import { RULE_LABEL, usd, VERDICT } from "@/lib/ui";
import { VerdictChip } from "./VerdictChip";

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeQuartz.withParams({
  accentColor: "#1c1917",
  fontFamily: "inherit",
  headerFontWeight: 600,
  rowHoverColor: "#f5f5f4",
  borderColor: "#e7e5e4",
  wrapperBorderRadius: 12,
});

const FILTERS: { key: string; label: string; verdicts: Verdict[] | null }[] = [
  { key: "all", label: "All", verdicts: null },
  { key: "held", label: "Needs you", verdicts: ["held"] },
  { key: "spent", label: "Spent", verdicts: ["auto_captured", "approved"] },
  { key: "stopped", label: "Stopped", verdicts: ["denied", "voided"] },
  { key: "problems", label: "Failed / refunded", verdicts: ["failed", "refunded"] },
];

const SPENT: Verdict[] = ["auto_captured", "approved"];
const POLL_MS = 2000;

type Row = Decision & { item: string };
type Totals = { id: string; item: string; price: number };

export function ControlRoom() {
  const gridRef = useRef<AgGridReact<Row>>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/decisions", { cache: "no-store" });
      const data: Decision[] = await res.json();
      setRows(data.map((d) => ({ ...d, item: d.product.title })));
      setError(null);
    } catch {
      setError("Lost connection to the server. Retrying…");
    }
  }, []);

  useEffect(() => {
    // Polling: run once now, then on an interval. The first call is deferred a tick so
    // React doesn't see a synchronous setState inside the effect.
    const first = setTimeout(load, 0);
    const timer = setInterval(load, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);

  const act = useCallback(
    async (path: string, body: object) => {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "Action failed.");
      await load();
    },
    [load],
  );

  // --- KPIs ---
  const kpis = useMemo(() => {
    const sum = (vs: Verdict[]) => rows.filter((r) => vs.includes(r.verdict)).reduce((t, r) => t + r.price, 0);
    return {
      spent: sum(SPENT),
      held: rows.filter((r) => r.verdict === "held"),
      stopped: sum(["denied", "voided"]),
      failed: rows.filter((r) => r.verdict === "failed").length,
    };
  }, [rows]);

  // --- Filtering (verdict buttons are an AG Grid external filter) ---
  const activeVerdicts = FILTERS.find((f) => f.key === filter)?.verdicts ?? null;
  const isExternalFilterPresent = useCallback(() => activeVerdicts !== null, [activeVerdicts]);
  const doesExternalFilterPass = useCallback(
    (node: IRowNode<Row>) => !activeVerdicts || (!!node.data && activeVerdicts.includes(node.data.verdict)),
    [activeVerdicts],
  );
  useEffect(() => {
    gridRef.current?.api?.onFilterChanged();
  }, [filter]);

  // --- Pinned bottom row: money actually taken ---
  const pinnedBottom = useMemo<Totals[]>(
    () => [{ id: "__total", item: "Total captured", price: kpis.spent }],
    [kpis.spent],
  );

  const columns = useMemo<ColDef<Row>[]>(
    () => [
      {
        field: "created_at",
        headerName: "Time",
        width: 120,
        sort: "desc",
        valueFormatter: (p) => (p.value ? formatTime(p.value) : ""),
      },
      { field: "item", headerName: "Item", flex: 2, minWidth: 220, tooltipField: "item" },
      {
        field: "price",
        headerName: "Price",
        width: 110,
        type: "rightAligned",
        valueFormatter: (p) => (p.value == null ? "" : usd(p.value)),
        cellClass: (p) => (p.node.rowPinned ? "font-semibold" : ""),
      },
      { field: "merchant", headerName: "Merchant", width: 170 },
      {
        field: "verdict",
        headerName: "Verdict",
        width: 140,
        enableCellChangeFlash: true,
        cellRenderer: (p: ICellRendererParams<Row>) => (p.data && !p.node.rowPinned ? <VerdictChip verdict={p.data.verdict} /> : null),
        filterValueGetter: (p) => (p.data ? VERDICT[p.data.verdict].label : ""),
      },
      {
        field: "rule_hit",
        headerName: "Rule",
        width: 190,
        valueFormatter: (p) => (p.value ? (RULE_LABEL[p.value] ?? p.value) : ""),
      },
      {
        field: "ai_reasoning",
        headerName: "AI reasoning",
        flex: 3,
        minWidth: 320,
        wrapText: true,
        autoHeight: true,
        cellClass: "leading-snug py-2 text-stone-600",
      },
      { field: "paypal_status", headerName: "PayPal", width: 125, enableCellChangeFlash: true },
      {
        field: "paypal_debug_id",
        headerName: "debug_id",
        width: 140,
        cellClass: "font-mono text-xs text-rose-700",
      },
      {
        headerName: "Actions",
        width: 170,
        pinned: "right",
        sortable: false,
        cellRenderer: (p: ICellRendererParams<Row>) =>
          p.data && !p.node.rowPinned ? <Actions row={p.data} act={act} /> : null,
      },
    ],
    [act],
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Control room</h1>
          <p className="text-sm text-stone-500">Every purchase decision the agent made, and why. Updates live.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Captured by PayPal" value={usd(kpis.spent)} tone="text-emerald-700" />
        <Kpi
          label="Waiting for you"
          value={`${kpis.held.length} · ${usd(kpis.held.reduce((t, r) => t + r.price, 0))}`}
          tone="text-amber-700"
          onClick={() => setFilter("held")}
        />
        <Kpi label="Stopped by the leash" value={usd(kpis.stopped)} tone="text-stone-700" />
        <Kpi label="Failed payments" value={String(kpis.failed)} tone="text-rose-700" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg bg-stone-100 p-1 text-sm">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-3 py-1 ${filter === f.key ? "bg-white font-medium shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items, merchants, reasoning…"
          className="ml-auto w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-stone-500 sm:w-72"
        />
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <div className="h-[600px] w-full">
        <AgGridReact<Row>
          ref={gridRef}
          theme={theme}
          rowData={rows}
          columnDefs={columns}
          defaultColDef={{ sortable: true, resizable: true }}
          getRowId={(p) => p.data.id}
          quickFilterText={search}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          pinnedBottomRowData={pinnedBottom}
          getRowClass={rowClass}
          cellFlashDuration={1200}
          tooltipShowDelay={400}
          animateRows
        />
      </div>
    </div>
  );
}

function Actions({ row, act }: { row: Row; act: (path: string, body: object) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const run = async (path: string, body: object) => {
    setBusy(true);
    await act(path, body);
    setBusy(false);
  };
  const btn = "rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50";

  if (row.verdict === "held") {
    return (
      <div className="flex h-full items-center gap-1.5">
        <button disabled={busy} onClick={() => run("/api/approve", { id: row.id, action: "approve" })} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>
          Approve
        </button>
        <button disabled={busy} onClick={() => run("/api/approve", { id: row.id, action: "deny" })} className={`${btn} bg-stone-200 text-stone-800 hover:bg-stone-300`}>
          Deny
        </button>
      </div>
    );
  }
  if (SPENT.includes(row.verdict)) {
    return (
      <div className="flex h-full items-center">
        <button disabled={busy} onClick={() => run("/api/refund", { id: row.id })} className={`${btn} border border-stone-300 text-stone-700 hover:bg-stone-100`}>
          Refund
        </button>
      </div>
    );
  }
  return null;
}

function Kpi({ label, value, tone, onClick }: { label: string; value: string; tone: string; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className="rounded-xl border border-stone-200 bg-white p-4 text-left">
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}>{value}</div>
    </Tag>
  );
}

function rowClass(p: RowClassParams<Row>) {
  if (p.node.rowPinned) return "bg-stone-50";
  if (p.data?.verdict === "held") return "bg-amber-50/60";
  return undefined;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" }) +
        " " +
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
