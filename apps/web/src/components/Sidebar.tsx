"use client";

import { useEffect, useState } from "react";
import { fetchRepos, fetchVersion, type Repo } from "@/lib/api";

interface SidebarProps {
  onSelectRepo: (fullName: string) => void;
  selectedRepo: string | null;
  onViewChange: (view: "repos" | "pulse" | "activity") => void;
  activeView: "repos" | "pulse" | "activity" | "repo-detail";
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({
  onSelectRepo,
  selectedRepo,
  onViewChange,
  activeView,
  theme,
  onToggleTheme,
  onOpenSettings,
}: SidebarProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState("v.0.0.3");
  const [repoURL, setRepoURL] = useState(
    "https://github.com/rubenalejandrocalderoncorona/SuperGit"
  );

  useEffect(() => {
    fetchRepos()
      .then(setRepos)
      .catch(() => setError(true));
    fetchVersion()
      .then((v) => { setVersion(v.version); setRepoURL(v.repo_url); })
      .catch(() => {});
  }, []);

  return (
    <aside
      className="w-64 h-full flex flex-col shrink-0 glass border-r"
      style={{
        borderColor: "var(--sg-border)",
        borderRadius: "0 12px 12px 0",
        boxShadow: "var(--sg-shadow)",
      }}
    >
      {/* ── Version banner ── */}
      <a
        href={repoURL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between px-3 py-1.5 text-xs font-mono transition-all duration-150 shrink-0"
        style={{
          background: "rgba(55,138,221,0.07)",
          borderBottom: "1px solid var(--sg-border)",
          borderRadius: "0 12px 0 0",
          color: "var(--sg-dim)",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--sg-accent)";
          (e.currentTarget as HTMLElement).style.background = "rgba(55,138,221,0.13)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--sg-dim)";
          (e.currentTarget as HTMLElement).style.background = "rgba(55,138,221,0.07)";
        }}
      >
        <span>SuperGit</span>
        <span
          className="px-1.5 py-0.5 rounded"
          style={{ background: "rgba(55,138,221,0.12)", color: "var(--sg-accent)" }}
        >
          {version}
        </span>
      </a>

      {/* ── Header row: title + theme toggle ── */}
      <div className="px-3 pt-3 pb-3 flex items-center gap-1.5">
        <span
          className="text-base font-bold tracking-tight shrink-0"
          style={{ color: "var(--sg-accent)" }}
        >
          SuperGit
        </span>

        <span className="flex-1" />

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 shrink-0 text-sm"
          style={{ color: "var(--sg-muted)", background: "transparent" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(55,138,221,0.12)";
            (e.currentTarget as HTMLElement).style.color = "var(--sg-accent)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--sg-muted)";
          }}
        >
          ⚙
        </button>

        <button
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 shrink-0"
          style={{ color: "var(--sg-muted)", background: "transparent" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(55,138,221,0.12)";
            (e.currentTarget as HTMLElement).style.color = "var(--sg-accent)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--sg-muted)";
          }}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </div>

      {/* Nav items */}
      <nav className="px-2 space-y-0.5 pb-2">
        <NavItem
          label="Repositories"
          icon="⊞"
          active={activeView === "repos" || activeView === "repo-detail"}
          onClick={() => onViewChange("repos")}
        />
        <NavItem
          label="Pulse"
          icon="◆"
          active={activeView === "pulse"}
          onClick={() => onViewChange("pulse")}
        />
        <NavItem
          label="Activity"
          icon="◈"
          active={activeView === "activity"}
          onClick={() => onViewChange("activity")}
        />
      </nav>

      <div className="h-px mx-3" style={{ background: "var(--sg-border)" }} />

      <div
        className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--sg-dim)" }}
      >
        Recent
      </div>

      {/* Repo list */}
      <ul className="flex-1 overflow-auto px-2 space-y-0.5 pb-4">
        {error && (
          <li className="px-3 py-2 text-xs rounded-lg" style={{ color: "var(--sg-warning)" }}>
            ⚠ Server not running
          </li>
        )}
        {repos.slice(0, 30).map((r) => (
          <li key={r.full_name}>
            <button
              onClick={() => onSelectRepo(r.full_name)}
              className="w-full text-left px-3 py-1.5 rounded-lg text-sm truncate transition-colors"
              style={{
                color: selectedRepo === r.full_name ? "var(--sg-accent)" : "var(--sg-text)",
                background:
                  selectedRepo === r.full_name
                    ? "rgba(55,138,221,0.12)"
                    : "transparent",
              }}
              onMouseEnter={(e) => {
                if (selectedRepo !== r.full_name)
                  (e.currentTarget as HTMLElement).style.background = "rgba(55,138,221,0.06)";
              }}
              onMouseLeave={(e) => {
                if (selectedRepo !== r.full_name)
                  (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              {r.name}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function NavItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
      style={{
        color: active ? "var(--sg-accent)" : "var(--sg-muted)",
        background: active ? "rgba(55,138,221,0.12)" : "transparent",
      }}
    >
      <span className="text-xs">{icon}</span>
      {label}
    </button>
  );
}
