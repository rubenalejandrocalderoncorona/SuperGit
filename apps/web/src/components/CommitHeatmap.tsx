"use client";

import { useEffect, useRef, useState } from "react";
import { fetchHeatmap, type HeatmapDay } from "@/lib/api";

interface Props {
  owner?: string;
  repo?: string;
  data?: HeatmapDay[]; // if provided, skips fetching
}

const CELL = 11;
const GAP = 2;
const STEP = CELL + GAP;
const DAY_LABEL_W = 26;
const MONTH_LABEL_H = 16;

const INTENSITY_VARS = [
  "var(--sg-heat-0)",
  "var(--sg-heat-1)",
  "var(--sg-heat-2)",
  "var(--sg-heat-3)",
  "var(--sg-heat-4)",
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS: { row: number; label: string }[] = [
  { row: 1, label: "Mon" },
  { row: 3, label: "Wed" },
  { row: 5, label: "Fri" },
];

interface TooltipState {
  x: number;
  y: number;
  date: string;
  count: number;
}

type Cell = HeatmapDay & { col: number; row: number };

function buildGrid(days: HeatmapDay[]): Cell[] {
  if (days.length === 0) return [];
  // Anchor the first day on its real weekday within week 0 (Sun=0).
  const firstDate = new Date(days[0].date + "T00:00:00");
  const firstDow = firstDate.getDay(); // 0=Sun
  return days.map((d, i) => {
    const slot = i + firstDow;
    return { ...d, col: Math.floor(slot / 7), row: slot % 7 };
  });
}

export function CommitHeatmap({ owner, repo, data: externalData }: Props) {
  const [days, setDays] = useState<HeatmapDay[]>(externalData ?? []);
  const [loading, setLoading] = useState(!externalData);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (externalData) {
      setDays(externalData);
      setLoading(false);
      return;
    }
    if (!owner || !repo) return;
    setLoading(true);
    fetchHeatmap(owner, repo)
      .then(setDays)
      .catch(() => setDays([]))
      .finally(() => setLoading(false));
  }, [owner, repo, externalData]);

  if (loading) {
    return (
      <div className="text-xs py-2" style={{ color: "var(--sg-dim)" }}>
        Loading…
      </div>
    );
  }

  if (days.length === 0) return null;

  const cells = buildGrid(days);
  const numCols = cells.length > 0 ? cells[cells.length - 1].col + 1 : 53;

  // Month labels: first occurrence of each month.
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (const c of cells) {
    const m = new Date(c.date + "T00:00:00").getMonth();
    if (m !== lastMonth) {
      if (monthLabels.length === 0 || c.col > monthLabels[monthLabels.length - 1].col + 2) {
        monthLabels.push({ col: c.col, label: MONTHS[m] });
      }
      lastMonth = m;
    }
  }

  const svgW = DAY_LABEL_W + numCols * STEP;
  const svgH = MONTH_LABEL_H + 7 * STEP;

  return (
    <div ref={containerRef} className="relative select-none" style={{ lineHeight: 0 }}>
      <svg
        width={svgW}
        height={svgH}
        style={{ overflow: "visible", display: "block" }}
      >
        {/* Month labels */}
        {monthLabels.map(({ col, label }) => (
          <text
            key={`m-${col}`}
            x={DAY_LABEL_W + col * STEP}
            y={MONTH_LABEL_H - 3}
            fontSize={9}
            fill="var(--sg-dim)"
            fontFamily="system-ui, sans-serif"
          >
            {label}
          </text>
        ))}

        {/* Day-of-week labels */}
        {DAY_LABELS.map(({ row, label }) => (
          <text
            key={label}
            x={0}
            y={MONTH_LABEL_H + row * STEP + CELL - 1}
            fontSize={8}
            fill="var(--sg-dim)"
            fontFamily="system-ui, sans-serif"
          >
            {label}
          </text>
        ))}

        {/* Cells */}
        {cells.map((c) => (
          <rect
            key={c.date}
            x={DAY_LABEL_W + c.col * STEP}
            y={MONTH_LABEL_H + c.row * STEP}
            width={CELL}
            height={CELL}
            rx={2}
            fill={INTENSITY_VARS[c.intensity]}
            onMouseEnter={(e) => {
              const rect = (e.target as SVGRectElement).getBoundingClientRect();
              const parent = containerRef.current?.getBoundingClientRect();
              if (!parent) return;
              setTooltip({
                x: rect.left - parent.left + CELL / 2,
                y: rect.top - parent.top - 4,
                date: c.date,
                count: c.count,
              });
            }}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-50 px-2 py-1 rounded text-xs whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
            background: "var(--sg-tooltip-bg)",
            border: "1px solid var(--sg-border-dim)",
            color: "var(--sg-text)",
            boxShadow: "var(--sg-card-shadow)",
          }}
        >
          <span style={{ color: "var(--sg-accent)", fontWeight: 600 }}>
            {tooltip.count} commit{tooltip.count !== 1 ? "s" : ""}
          </span>{" "}
          on {tooltip.date}
        </div>
      )}
    </div>
  );
}
