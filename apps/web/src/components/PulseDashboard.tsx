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
import { fetchRepos, fetchPulse, fetchBranchCount, type Repo, type PulseData, type CommitDay } from "@/lib/api";

export function PulseDashboard() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [search, setSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [branchCount, setBranchCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRepos()
      .then((list) => setRepos(list.filter((r) => r.source === "github")))
      .catch(() => {});
  }, []);

  const handleSelect = (repo: Repo) => {
    setSelectedRepo(repo);
    setPulse(null);
    setBranchCount(null);
    setError(null);

    const parts = repo.full_name.split("/");
    if (parts.length !== 2) return;
    const [owner, name] = parts;

    setLoading(true);
    Promise.all([
      fetchPulse(owner, name),
      fetchBranchCount(owner, name).catch(() => null),
    ])
      .then(([pulseData, branches]) => {
        setPulse(pulseData);
        setBranchCount(branches);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const filtered = repos.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col md:flex-row h-full gap-4">
      {/* ── Repo list: side panel on desktop, select on mobile ── */}
      <aside
        className="hidden md:flex w-64 shrink-0 flex-col glass"
        style={{ borderRadius: 12, boxShadow: "var(--sg-card-shadow)" }}
      >
        <div className="p-3 border-b" style={{ borderColor: "var(--sg-border)" }}>
          <div className="relative">
            <span
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: "var(--sg-muted)" }}
            >
              ⌕
            </span>
            <input
              type="text"
              placeholder="Search repos…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg outline-none"
              style={{
                background: "var(--sg-input-bg)",
                border: "1px solid var(--sg-border-dim)",
                color: "var(--sg-text)",
              }}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--sg-accent)"; }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--sg-border-dim)"; }}
            />
          </div>
        </div>

        <ul className="flex-1 overflow-auto py-1">
          {filtered.length === 0 && (
            <li className="px-4 py-3 text-xs" style={{ color: "var(--sg-muted)" }}>
              No repositories found
            </li>
          )}
          {filtered.map((r) => {
            const active = selectedRepo?.full_name === r.full_name;
            return (
              <li key={r.full_name}>
                <button
                  onClick={() => handleSelect(r)}
                  className="w-full text-left px-3 py-2 flex flex-col gap-0.5 transition-colors"
                  style={{
                    background: active ? "rgba(55,138,221,0.12)" : "transparent",
                    borderLeft: active ? "2px solid var(--sg-accent)" : "2px solid transparent",
                  }}
                >
                  <span
                    className="text-xs font-medium truncate"
                    style={{ color: active ? "var(--sg-accent)" : "var(--sg-text)" }}
                  >
                    {r.name}
                  </span>
                  {r.language && (
                    <span className="text-xs" style={{ color: "var(--sg-dim)" }}>
                      {r.language}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Mobile repo picker */}
      <div className="md:hidden shrink-0">
        <select
          value={selectedRepo?.full_name ?? ""}
          onChange={(e) => {
            const r = repos.find((r) => r.full_name === e.target.value);
            if (r) handleSelect(r);
          }}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{
            background: "var(--sg-input-bg)",
            border: "1px solid var(--sg-border-dim)",
            color: "var(--sg-text)",
          }}
        >
          <option value="">Select a repository…</option>
          {repos.map((r) => (
            <option key={r.full_name} value={r.full_name}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* ── Right: pulse panel ── */}
      <div className="flex-1 min-w-0">
        {!selectedRepo && (
          <div className="flex items-center justify-center h-full text-sm" style={{ color: "var(--sg-muted)" }}>
            Select a repository to view its pulse
          </div>
        )}

        {selectedRepo && loading && (
          <div className="flex items-center justify-center h-full text-sm" style={{ color: "var(--sg-muted)" }}>
            Loading pulse for {selectedRepo.name}…
          </div>
        )}

        {selectedRepo && error && (
          <div className="flex items-center justify-center h-full text-sm" style={{ color: "var(--sg-warning)" }}>
            ⚠ {error}
          </div>
        )}

        {selectedRepo && pulse && !loading && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold" style={{ color: "var(--sg-text)" }}>
                {selectedRepo.name}
                <span className="text-sm font-normal ml-2" style={{ color: "var(--sg-muted)" }}>
                  pulse
                </span>
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--sg-muted)" }}>
                Last 30 days · {selectedRepo.full_name}
              </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <StatCard label="Commits (30d)" value={String(pulse.total_commits_30d)} />
              <StatCard label="Most Active Day" value={pulse.most_active_day || "—"} />
              <StatCard label="Peak Window" value={pulse.highest_velocity_window || "—"} small />
              <StatCard
                label="Branches"
                value={branchCount !== null ? String(branchCount) : "—"}
              />
            </div>

            {/* Bar chart */}
            <div
              className="glass p-4"
              style={{ borderRadius: 11, boxShadow: "var(--sg-card-shadow)", height: 240 }}
            >
              <div className="text-xs font-semibold mb-3" style={{ color: "var(--sg-muted)" }}>
                Commits per day
              </div>
              <ResponsiveContainer width="100%" height="88%">
                <BarChart
                  data={pulse.commits_by_day}
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
                    {pulse.commits_by_day.map((entry, i) => (
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
        )}
      </div>
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
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
        boxShadow: "var(--sg-shadow)",
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
      style={{ borderRadius: 11, boxShadow: "var(--sg-card-shadow)" }}
    >
      <div className="text-xs mb-1" style={{ color: "var(--sg-muted)" }}>
        {label}
      </div>
      <div
        className={`font-bold ${small ? "text-sm" : "text-xl"}`}
        style={{ color: "var(--sg-accent)" }}
      >
        {value}
      </div>
    </div>
  );
}
