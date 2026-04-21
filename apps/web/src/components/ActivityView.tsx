"use client";

import { useEffect, useState } from "react";
import { fetchUserHeatmap, type HeatmapDay } from "@/lib/api";
import { CommitHeatmap } from "@/components/CommitHeatmap";

export function ActivityView() {
  const [data, setData] = useState<HeatmapDay[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchUserHeatmap()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: "var(--sg-muted)" }}>
            Contributions · past year
          </h2>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-opacity"
            style={{
              color: "var(--sg-muted)",
              background: "var(--sg-surface)",
              border: "1px solid var(--sg-border-dim)",
              opacity: loading ? 0.4 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            title="Refresh heatmap"
          >
            <svg
              width={12}
              height={12}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: loading ? "none" : undefined }}
            >
              <path d="M1 4v4h4" />
              <path d="M15 12v-4h-4" />
              <path d="M13.5 6A6 6 0 0 0 3 6.5" />
              <path d="M2.5 10A6 6 0 0 0 13 9.5" />
            </svg>
            Refresh
          </button>
        </div>

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
