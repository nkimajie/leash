"use client";

// The restocks timeline, drawn with Bryntum Scheduler: one row per restock and a mark on each
// day it runs. The next run can be dragged to another day; the runs after it follow on every N days.
// Bryntum needs the browser, so restock-manager.tsx loads this file with `ssr: false`.

import "@bryntum/scheduler/fontawesome/css/fontawesome.css";
import "@bryntum/scheduler/fontawesome/css/solid.css";
import "@bryntum/scheduler/scheduler.css";
import "@bryntum/scheduler/svalbard-light.css";
import type { DomConfig, EventModel, Model } from "@bryntum/scheduler";
import { BryntumScheduler, type BryntumSchedulerProps } from "@bryntum/scheduler-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Restock } from "@/schemas";

const WEEKS_BACK = 5; // far enough to show last runs
const WEEKS_AHEAD = 8;

const COLOR = { next: "#0ea5e9", due: "#f59e0b", later: "#7dd3fc", last: "#a8a29e", paused: "#d6d3d1" }; // sky, amber, sky-300, stone

type RunKind = "last" | "next" | "later";

export function RestocksTimeline(props: {
  restocks: Restock[];
  /** Called when you drop the next run on another day. */
  onMoveNextRun: (restockId: string, nextRunAt: string) => void;
}) {
  const [today] = useState(() => startOfDay(new Date()));
  // This file only runs in the browser, so the screen size is known up front.
  const [isPhone] = useState(() => window.matchMedia("(max-width: 640px)").matches);

  // The Bryntum wrapper pushes every prop that changes into the scheduler, so its settings are
  // built once and its rows and marks only when the restocks change.
  const settings = useMemo(() => schedulerSettings(today, isPhone), [today, isPhone]);
  const rowsAndMarks = useMemo(() => timelineData(props.restocks, today), [props.restocks, today]);

  // Listen for drops here rather than through a prop, for the same reason.
  const scheduler = useRef<BryntumScheduler>(null);
  const { onMoveNextRun } = props;
  useEffect(() => {
    const instance = scheduler.current?.instance;
    const afterEventDrop = ({ eventRecords, valid }: { eventRecords: EventModel[]; valid: boolean }) => {
      const moved = eventRecords[0];
      if (valid && moved) onMoveNextRun(String(moved.resourceId), (moved.startDate as Date).toISOString());
    };
    instance?.on({ afterEventDrop });
    return () => {
      if (instance && !instance.isDestroyed) instance.un({ afterEventDrop });
    };
  }, [onMoveNextRun]);

  return (
    // Each mark is one day wide, so drop Bryntum's padding inside it and centre the icon.
    <div className="[&_.b-sch-event]:justify-center [&_.b-sch-event]:[--b-sch-event-padding-inline:0]">
      <BryntumScheduler ref={scheduler} {...settings} {...rowsAndMarks} />
    </div>
  );
}

function schedulerSettings(today: Date, isPhone: boolean): BryntumSchedulerProps {
  return {
    autoHeight: true,
    rowHeight: 52,
    barMargin: 10,
    startDate: addDays(today, -WEEKS_BACK * 7),
    endDate: addDays(today, WEEKS_AHEAD * 7),
    // Open on the last two weeks and the weeks ahead (on a phone, on today); scroll sideways for more.
    visibleDate: { date: addDays(today, isPhone ? -2 : -15), block: "start" },
    viewPreset: "weekAndDayLetter",
    tickSize: 24,
    eventStyle: "filled",
    zoomOnMouseWheel: false,
    zoomOnTimeAxisDoubleClick: false,
    columns: [
      {
        text: "Restock",
        field: "name",
        width: isPhone ? 130 : 210,
        renderer: ({ record }: { record: Model }) => restockCell(record),
      },
    ],
    eventRenderer: () => "", // just the colour and icon; the tooltip has the words
    // Only dragging the next run is allowed: no creating, resizing, editing or right-click menus.
    eventDragFeature: {
      constrainDragToResource: true,
      validatorFn: ({ startDate }) => ({ valid: startDate >= today, message: "Pick today or a later day" }),
    },
    eventTooltipFeature: { template: ({ eventRecord }) => tooltipFor(eventRecord) },
    timeRangesFeature: { showCurrentTimeLine: true, currentDateFormat: "MMM D" },
    eventDragCreateFeature: false,
    eventResizeFeature: false,
    eventEditFeature: false,
    eventMenuFeature: false,
    scheduleMenuFeature: false,
    cellMenuFeature: false,
    headerMenuFeature: false,
    scheduleTooltipFeature: false,
    sortFeature: false,
  };
}

const RUN_NAME: Record<RunKind, string> = { last: "Last run", next: "Next run", later: "Later run" };

/** One row per restock; a mark for its last run, its next run, and every run after that. */
function timelineData(restocks: Restock[], today: Date) {
  const end = addDays(today, WEEKS_AHEAD * 7);
  const resources = restocks.map((r) => ({ id: r.id, name: r.prompt, everyDays: r.everyDays, active: r.active }));
  const events = restocks.flatMap((restock) => {
    const run = (kind: RunKind, day: Date, index = 0) => ({
      id: `${restock.id}-${kind}-${index}`,
      resourceId: restock.id,
      startDate: day,
      endDate: addDays(day, 1),
      name: `${RUN_NAME[kind]}: ${restock.prompt}`, // read out by screen readers
      kind,
      paused: !restock.active,
      due: kind === "next" && day <= today,
      everyDays: restock.everyDays,
      // Only an active restock's next run can be dragged; the later runs follow from it.
      draggable: restock.active && kind === "next",
      resizable: false,
      iconCls: kind === "last" ? "fa fa-check" : kind === "next" ? "fa fa-cart-shopping" : "",
      eventColor: !restock.active ? COLOR.paused : kind === "next" && day <= today ? COLOR.due : COLOR[kind],
    });

    const runs = [];
    if (restock.lastRunAt) runs.push(run("last", startOfDay(new Date(restock.lastRunAt))));
    const next = startOfDay(new Date(restock.nextRunAt));
    runs.push(run("next", next));
    for (let day = addDays(next, restock.everyDays), i = 1; day < end; day = addDays(day, restock.everyDays), i++) {
      runs.push(run("later", day, i));
    }
    return runs;
  });
  return { resources, events };
}

/** The row's label: plain text only (`text`, not `html`), so a restock's wording can never inject HTML. */
function restockCell(record: Model): DomConfig {
  const everyDays = Number(record.getData("everyDays"));
  const active = Boolean(record.getData("active"));
  return {
    children: [
      { tag: "div", className: "truncate font-medium text-stone-900", text: String(record.getData("name")) },
      {
        tag: "div",
        className: "text-xs text-stone-500",
        text: active ? `Every ${everyDays} ${everyDays === 1 ? "day" : "days"}` : "Paused",
      },
    ],
  };
}

/** Plain text only (`text`, not `html`), so a restock's wording can never inject HTML. */
function tooltipFor(event: EventModel): DomConfig {
  const kind = event.getData("kind") as RunKind;
  const day = formatDay(event.startDate as Date);
  const everyDays = Number(event.getData("everyDays"));
  const line = (text: string, className = "") => ({ tag: "div", className, text });
  const lines =
    kind === "last"
      ? [line(`Last ran ${day}`)]
      : kind === "next"
        ? [
            line(event.getData("due") ? `Due now (set for ${day})` : `Next run: ${day}`, "font-semibold"),
            line(
              event.getData("paused")
                ? "Paused: it won't run until you turn it back on."
                : "Drag it to another day to move it.",
            ),
          ]
        : [line(`Then ${day}`), line(`Every ${everyDays} days after the next run`, "text-xs")];
  return { children: lines };
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const formatDay = (date: Date) => date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
