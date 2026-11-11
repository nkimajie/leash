"use client";

// Money reserved at PayPal, drawn with Bryntum Scheduler: one row per payment PayPal reserved
// (authorized) before it was decided. Each bar runs from when the money was reserved to when it
// was decided. While a payment still waits for you, its bar shows the week Leash gives you to
// answer, then (dashed) how long PayPal itself would keep the money reserved.
// Bryntum needs the browser, so control-room.tsx loads this file with `ssr: false`.

import "@bryntum/scheduler/fontawesome/css/fontawesome.css";
import "@bryntum/scheduler/fontawesome/css/solid.css";
import "@bryntum/scheduler/scheduler.css";
import "@bryntum/scheduler/svalbard-light.css";
import type { DomConfig, EventModel, Model } from "@bryntum/scheduler";
import { BryntumScheduler, type BryntumSchedulerProps } from "@bryntum/scheduler-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DAYS_TO_ANSWER, PAYPAL_AUTHORIZATION_DAYS, isSampleHistory, type Decision, type Outcome } from "@/schemas";
import { formatMoney, formatWhen } from "@/lib/format";
import { OUTCOME_COLOR, OUTCOME_STYLE } from "@/lib/labels";

const DAY_MS = 86_400_000;
/** Only the latest reservations, so the timeline stays short. */
const MAX_ROWS = 10;
/** A yes or no given within minutes would be an invisible sliver, so bars are drawn at least this long. */
const SHORTEST_BAR_MS = DAY_MS / 3;

/** Bars on the timeline: waiting for you, PayPal's own limit (still waiting), or decided. */
type Part = "waiting" | "paypal_limit" | "decided";

export function ReservationsTimeline(props: { decisions: Decision[]; onSelect?: (decisionId: string) => void }) {
  const [today] = useState(() => startOfDay(new Date()));
  // This file only runs in the browser, so the screen size is known up front.
  const [isPhone] = useState(() => window.matchMedia("(max-width: 640px)").matches);

  // The control room re-renders and re-fetches every couple of seconds, and the Bryntum wrapper
  // pushes every prop that changes into the scheduler. So the settings are built once, and the
  // rows only when something really changed (compared as text).
  const settings = useMemo(() => schedulerSettings(today, isPhone), [today, isPhone]);
  const asText = JSON.stringify(timelineData(props.decisions, today));
  const rowsAndBars = useMemo(() => withDates(JSON.parse(asText)), [asText]);
  const isEmpty = rowsAndBars.resources.length === 0;

  // Listen for clicks here rather than through a prop, for the same reason.
  const scheduler = useRef<BryntumScheduler>(null);
  const { onSelect } = props;
  useEffect(() => {
    const instance = scheduler.current?.instance;
    const eventClick = ({ eventRecord }: { eventRecord: EventModel }) => onSelect?.(String(eventRecord.resourceId));
    const cellClick = ({ record }: { record: Model }) => onSelect?.(String(record.id));
    instance?.on({ eventClick, cellClick });
    return () => {
      if (instance && !instance.isDestroyed) instance.un({ eventClick, cellClick });
    };
  }, [onSelect, isEmpty]); // isEmpty: the scheduler only exists once there's something to show

  if (isEmpty) return <p className="px-4 py-6 text-sm text-ink-soft sm:px-6">Nothing has been reserved at PayPal yet.</p>;
  return <BryntumScheduler ref={scheduler} {...settings} {...rowsAndBars} />;
}

function schedulerSettings(today: Date, isPhone: boolean): BryntumSchedulerProps {
  return {
    autoHeight: true,
    readOnly: true, // a picture of what happened: nothing to drag or edit
    rowHeight: 48,
    barMargin: 10,
    visibleDate: { date: new Date(today.getTime() - 3 * DAY_MS), block: "start" },
    viewPreset: "weekAndDayLetter",
    tickSize: 30,
    eventStyle: "filled",
    zoomOnMouseWheel: false,
    zoomOnTimeAxisDoubleClick: false,
    columns: [
      {
        text: "Payment",
        field: "name",
        width: isPhone ? 150 : 250,
        renderer: ({ record }: { record: Model }) => rowCell(record),
      },
    ],
    // Words only on the long bars of a payment still waiting; a decided bar is often too short for them.
    eventRenderer: ({ eventRecord }) =>
      eventRecord.getData("part") === "decided" ? "" : { tag: "span", text: String(eventRecord.getData("label")) },
    eventTooltipFeature: { template: ({ eventRecord }) => tooltipFor(eventRecord) },
    timeRangesFeature: { showCurrentTimeLine: true, currentDateFormat: "MMM D" },
    eventMenuFeature: false,
    scheduleMenuFeature: false,
    cellMenuFeature: false,
    headerMenuFeature: false,
    scheduleTooltipFeature: false,
    sortFeature: false,
  };
}

/** Rows and bars for the scheduler, with dates as text (see `withDates`). */
function timelineData(decisions: Decision[], today: Date) {
  const reserved = decisions
    .filter((d) => wasReserved(d))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_ROWS);

  const resources = reserved.map((d) => ({
    id: d.id,
    name: d.title,
    amount: d.amount,
    outcome: d.outcome,
    sample: isSampleHistory(d),
  }));

  const events = reserved.flatMap((d) => {
    const reservedAt = new Date(d.createdAt).getTime();
    const bar = (part: Part, from: number, to: number, label: string) => ({
      id: `${d.id}-${part}`,
      resourceId: d.id,
      startDate: new Date(from).toISOString(),
      endDate: new Date(to).toISOString(),
      name: `${d.title}: ${label}`, // read out by screen readers
      title: d.title,
      label,
      part,
      outcome: d.outcome,
      reservedAt: d.createdAt,
      decidedAt: d.outcome === "held" ? null : d.updatedAt,
      sample: isSampleHistory(d),
      eventColor: OUTCOME_COLOR[d.outcome],
      // PayPal's own limit is drawn dashed: it's how long PayPal would wait, not something Leash will do.
      eventStyle: part === "paypal_limit" ? ("dashed" as const) : null,
    });

    if (d.outcome === "held") {
      const leashReleasesAt = reservedAt + DAYS_TO_ANSWER * DAY_MS;
      const payPalReleasesAt = reservedAt + PAYPAL_AUTHORIZATION_DAYS * DAY_MS;
      return [
        bar("waiting", reservedAt, leashReleasesAt, "Waiting for you"),
        bar("paypal_limit", leashReleasesAt, payPalReleasesAt, "PayPal's own limit"),
      ];
    }
    const decidedAt = Math.max(new Date(d.updatedAt).getTime(), reservedAt + SHORTEST_BAR_MS);
    return [bar("decided", reservedAt, decidedAt, OUTCOME_STYLE[d.outcome].label)];
  });

  // From a few days before the first reservation (at most two weeks back) to just after the last bar ends.
  const firstStart = Math.min(today.getTime(), ...events.map((e) => new Date(e.startDate).getTime()));
  const lastEnd = Math.max(today.getTime(), ...events.map((e) => new Date(e.endDate).getTime()));
  const startDate = new Date(Math.max(firstStart - 2 * DAY_MS, today.getTime() - 14 * DAY_MS));
  const endDate = new Date(Math.max(lastEnd + DAY_MS, today.getTime() + 3 * DAY_MS));

  return {
    startDate: startOfDay(startDate).toISOString(),
    endDate: startOfDay(endDate).toISOString(),
    resources,
    events,
  };
}

type TimelineData = ReturnType<typeof timelineData>;

/** Turns the text dates back into Date objects for Bryntum. */
function withDates(data: TimelineData) {
  return {
    ...data,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    events: data.events.map((e) => ({ ...e, startDate: new Date(e.startDate), endDate: new Date(e.endDate) })),
  };
}

/** PayPal reserved the money first: held, then approved, denied, refunded, or a capture that failed. */
function wasReserved(decision: Decision) {
  const reservedFirst: Outcome[] = ["held", "approved", "denied", "refunded"];
  return (
    reservedFirst.includes(decision.outcome) || (decision.outcome === "failed" && !!decision.paypal.authorizationId)
  );
}

/** The row's label: plain text only (`text`, not `html`), so a product's name can never inject HTML. */
function rowCell(record: Model): DomConfig {
  const outcome = record.getData("outcome") as Outcome;
  const sample = record.getData("sample") ? " · sample" : "";
  return {
    children: [
      { tag: "div", className: "truncate font-medium text-ink", text: String(record.getData("name")) },
      {
        tag: "div",
        className: "flex items-center gap-1.5 text-xs text-ink-soft",
        children: [
          { tag: "span", className: "h-2 w-2 shrink-0 rounded-full", style: { background: OUTCOME_COLOR[outcome] } },
          {
            tag: "span",
            text: `${formatMoney(Number(record.getData("amount")))} · ${OUTCOME_STYLE[outcome].label}${sample}`,
          },
        ],
      },
    ],
  };
}

function tooltipFor(event: EventModel): DomConfig {
  const part = event.getData("part") as Part;
  const outcome = event.getData("outcome") as Outcome;
  const reservedAt = String(event.getData("reservedAt"));
  const line = (text: string, className = "") => ({ tag: "div", className, text });
  const reservedPlus = (days: number) => new Date(new Date(reservedAt).getTime() + days * DAY_MS).toISOString();

  const lines =
    part === "waiting"
      ? [
          line(`PayPal reserved it ${formatWhen(reservedAt)}. Nothing is taken until you say yes.`),
          line(`If you don't answer, Leash releases it ${formatWhen(reservedPlus(DAYS_TO_ANSWER))}.`),
        ]
      : part === "paypal_limit"
        ? [
            line(`PayPal itself would keep it reserved until ${formatWhen(reservedPlus(PAYPAL_AUTHORIZATION_DAYS))}`),
            line(`(${PAYPAL_AUTHORIZATION_DAYS} days). Leash never waits that long.`),
          ]
        : [
            line(`${outcome === "refunded" ? "Paid" : "Reserved"} ${formatWhen(reservedAt)}`),
            line(`${OUTCOME_STYLE[outcome].label} ${formatWhen(String(event.getData("decidedAt")))}`),
          ];
  const sample = event.getData("sample") ? [line("Sample history: never sent to PayPal.", "text-xs")] : [];
  return { children: [line(String(event.getData("title")), "font-semibold"), ...lines, ...sample] };
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
