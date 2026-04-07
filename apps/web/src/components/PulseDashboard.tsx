"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { fetchPulse, type PulseData, type CommitDay } from "@/lib/api";

interface PulseDashboardProps {
  repoFullName: string | null;
}

export function PulseDashboard({ repoFullName }: PulseDashboardProps) {
  const [data, setData] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoFullName) return;
    const parts = repoFullName.split("/");
    if (parts.length !== 2) return;
    setLoading(true);
    setError(null);
    setData(null);
    fetchPulse(parts[0], parts[1])
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [repoFullName]);

  if (!repoFullName) {
    return (
      <div className="flex items-center justify-center h-64 text-sm" style={{ color: "var(--sg-muted)" }}>
        Select a repository from the sidebar to view pulse
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm" style={{ color: "var(--sg-muted)" }}>
        Loading pulse for {repoFullName}…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-sm" style={{ color: "var(--sg-warning)" }}>
        ⚠ {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 p-2">
      <div>
        <h2 className="text-xl font-bold" style={{ color: "var(--sg-text)" }}>
          Pulse <span style={{ color: "var(--sg-accent)" }}>{repoFullName}</span>
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--sg-muted)" }}>
          Last 30 days of activity
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Most Active Day" value={data.most_active_day || "—"} />
        <StatCard label="Commits (30d)" value={String(data.total_commits_30d)} />
        <StatCard label="Peak Window" value={data.highest_velocity_window || "—"} small />
      </div>

      <div
        className="glass p-4"
        style={{ borderRadius: 11, boxShadow: "var(--sg-card-shadow)", height: 260 }}
      >
        <div className="text-xs font-semibold mb-3" style={{ color: "var(--sg-muted)" }}>
          Commits per day
        </div>
        <ResponsiveContainer width="100%" height="88%">
          <BarChart
            data={data.commits_by_day}
            barSize={6}
            margin={{ top: 0, right: 4, bottom: 0, left: -20 }}
          >
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--sg-muted)", fontSize: 9 }}
              tickFormatter={(d: string) => d.slice(5)}
              interval={4}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--sg-muted)", fontSize: 9 }}
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(55,138,221,0.08)", radius: 4 }}
              content={<CustomTooltip />}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {data.commits_by_day.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.count > 0 ? "var(--sg-accent)" : "var(--sg-empty-bar)"}
                  fillOpacity={entry.count > 0 ? 0.85 : 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; payload: CommitDay }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const count = payload[0].value;
  return (
    <div
      style={{
        background: "var(--sg-surface)",
        border: "1px solid var(--sg-border-dim)",
        borderRadius: 8,
        padding: "8px 12px",
        boxShadow: "var(--sg-card-shadow)",
        minWidth: 110,
      }}
    >
      <div style={{ color: "var(--sg-muted)", fontSize: 11, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: "var(--sg-text)", fontSize: 13, fontWeight: 600 }}>
        {count}{" "}
        <span style={{ color: "var(--sg-muted)", fontWeight: 400, fontSize: 11 }}>
          {count === 1 ? "commit" : "commits"}
        </span>
      </div>
    </div>
  );
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div
      className="glass p-4"
      style={{ borderRadius: 11, boxShadow: "var(--sg-card-shadow)" }}
    >
      <div className="text-xs mb-1" style={{ color: "var(--sg-muted)" }}>{label}</div>
      <div
        className={`font-bold ${small ? "text-sm" : "text-2xl"}`}
        style={{ color: "var(--sg-accent)" }}
      >
        {value}
      </div>
    </div>
  );
}
