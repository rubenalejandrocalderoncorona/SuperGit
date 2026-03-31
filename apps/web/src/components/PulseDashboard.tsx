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
import { fetchPulse, type PulseData } from "@/lib/api";

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
      <div
        className="flex items-center justify-center h-64 text-sm"
        style={{ color: "#5a8ab0" }}
      >
        Select a repository from the sidebar to view pulse
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-64 text-sm"
        style={{ color: "#5a8ab0" }}
      >
        Loading pulse for {repoFullName}…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center h-64 text-sm"
        style={{ color: "#d4a84b" }}
      >
        ⚠ {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 p-2">
      <div>
        <h2 className="text-xl font-bold" style={{ color: "#d8e8f5" }}>
          Pulse{" "}
          <span style={{ color: "#378add" }}>{repoFullName}</span>
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "#5a8ab0" }}>
          Last 30 days of activity
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Most Active Day"
          value={data.most_active_day || "—"}
        />
        <StatCard
          label="Commits (30d)"
          value={String(data.total_commits_30d)}
        />
        <StatCard
          label="Peak Window"
          value={data.highest_velocity_window || "—"}
          small
        />
      </div>

      {/* Bar chart */}
      <div
        className="glass p-4"
        style={{
          borderRadius: 11,
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          height: 260,
        }}
      >
        <div
          className="text-xs font-semibold mb-3"
          style={{ color: "#5a8ab0" }}
        >
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
              tick={{ fill: "#2a4a6a", fontSize: 9 }}
              tickFormatter={(d: string) => d.slice(5)}
              interval={4}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#2a4a6a", fontSize: 9 }}
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#162030",
                border: "1px solid rgba(30,58,95,0.8)",
                borderRadius: 8,
                color: "#d8e8f5",
                fontSize: 12,
              }}
              formatter={(v) => [v, "commits"]}
              labelFormatter={(l) => String(l)}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {data.commits_by_day.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.count > 0 ? "#378add" : "#1e3a5f"}
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

function StatCard({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div
      className="glass p-4"
      style={{
        borderRadius: 11,
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      }}
    >
      <div className="text-xs mb-1" style={{ color: "#5a8ab0" }}>
        {label}
      </div>
      <div
        className={`font-bold ${small ? "text-sm" : "text-2xl"}`}
        style={{ color: "#378add" }}
      >
        {value}
      </div>
    </div>
  );
}
