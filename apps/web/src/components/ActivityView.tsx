"use client";

import { useEffect, useState } from "react";
import { fetchUserHeatmap, type HeatmapDay } from "@/lib/api";
import { CommitHeatmap } from "@/components/CommitHeatmap";

export function ActivityView() {
  const [data, setData] = useState<HeatmapDay[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserHeatmap()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalCommits = data?.reduce((sum, d) => sum + d.count, 0) ?? 0;
  const activeDays = data?.filter((d) => d.count > 0).length ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold mb-0.5" style={{ color: "var(--sg-text)" }}>
          Activity
        </h1>
        <p className="text-xs" style={{ color: "var(--sg-muted)" }}>
          Your contributions across all repositories · past year
        </p>
      </div>

      {/* Stats */}
      {data && !loading && (
        <div className="flex gap-4 flex-wrap">
          <div
            className="glass px-4 py-3 rounded-xl flex flex-col gap-0.5"
            style={{ boxShadow: "var(--sg-card-shadow)" }}
          >
            <span className="text-xs" style={{ color: "var(--sg-muted)" }}>Total commits</span>
            <span className="text-2xl font-bold" style={{ color: "var(--sg-accent)" }}>
              {totalCommits.toLocaleString()}
            </span>
          </div>
          <div
            className="glass px-4 py-3 rounded-xl flex flex-col gap-0.5"
            style={{ boxShadow: "var(--sg-card-shadow)" }}
          >
            <span className="text-xs" style={{ color: "var(--sg-muted)" }}>Active days</span>
            <span className="text-2xl font-bold" style={{ color: "var(--sg-accent)" }}>
              {activeDays}
            </span>
          </div>
        </div>
      )}

      {/* Heatmap card */}
      <div
        className="glass p-5"
        style={{ borderRadius: 11, boxShadow: "var(--sg-card-shadow)" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--sg-muted)" }}>
          Contributions · past year
        </h2>

        {loading && (
          <p className="text-sm" style={{ color: "var(--sg-dim)" }}>Loading…</p>
        )}

        {error && (
          <p className="text-sm" style={{ color: "var(--sg-warning)" }}>⚠ {error}</p>
        )}

        {data && !loading && (
          <div style={{ overflowX: "auto" }}>
            <CommitHeatmap data={data} />
          </div>
        )}

        {/* Legend */}
        {data && !loading && (
          <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: "var(--sg-dim)" }}>
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 2,
                  display: "inline-block",
                  background: `var(--sg-heat-${i})`,
                }}
              />
            ))}
            <span>More</span>
          </div>
        )}
      </div>
    </div>
  );
}
