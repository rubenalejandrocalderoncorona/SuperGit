"use client";

import { useEffect, useState } from "react";
import { fetchRepos, type Repo } from "@/lib/api";

interface SidebarProps {
  onSelectRepo: (fullName: string) => void;
  selectedRepo: string | null;
  onViewChange: (view: "repos" | "pulse") => void;
  activeView: "repos" | "pulse";
}

export function Sidebar({
  onSelectRepo,
  selectedRepo,
  onViewChange,
  activeView,
}: SidebarProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchRepos()
      .then(setRepos)
      .catch(() => setError(true));
  }, []);

  return (
    <aside
      className="w-64 h-full flex flex-col shrink-0 glass border-r"
      style={{
        borderColor: "rgba(55,138,221,0.18)",
        borderRadius: "0 12px 12px 0",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {/* App title */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-2">
        <span
          className="text-lg font-bold tracking-tight"
          style={{ color: "#378add" }}
        >
          SuperGit
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-mono"
          style={{
            background: "rgba(55,138,221,0.12)",
            color: "#5a8ab0",
          }}
        >
          v1.0.0
        </span>
      </div>

      {/* Nav items */}
      <nav className="px-2 space-y-0.5 pb-2">
        <NavItem
          label="Repositories"
          icon="⊞"
          active={activeView === "repos"}
          onClick={() => onViewChange("repos")}
        />
        <NavItem
          label="Pulse"
          icon="◆"
          active={activeView === "pulse"}
          onClick={() => onViewChange("pulse")}
        />
      </nav>

      <div className="h-px mx-3" style={{ background: "rgba(55,138,221,0.12)" }} />

      <div
        className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider"
        style={{ color: "#2a4a6a" }}
      >
        Recent
      </div>

      {/* Repo list */}
      <ul className="flex-1 overflow-auto px-2 space-y-0.5 pb-4">
        {error && (
          <li
            className="px-3 py-2 text-xs rounded-lg"
            style={{ color: "#d4a84b" }}
          >
            ⚠ Server not running
          </li>
        )}
        {repos.slice(0, 30).map((r) => (
          <li key={r.full_name}>
            <button
              onClick={() => onSelectRepo(r.full_name)}
              className="w-full text-left px-3 py-1.5 rounded-lg text-sm truncate transition-colors"
              style={{
                color:
                  selectedRepo === r.full_name ? "#378add" : "#d8e8f5",
                background:
                  selectedRepo === r.full_name
                    ? "rgba(55,138,221,0.12)"
                    : "transparent",
              }}
              onMouseEnter={(e) => {
                if (selectedRepo !== r.full_name) {
                  (e.target as HTMLElement).style.background =
                    "rgba(255,255,255,0.04)";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedRepo !== r.full_name) {
                  (e.target as HTMLElement).style.background = "transparent";
                }
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
        color: active ? "#378add" : "#5a8ab0",
        background: active ? "rgba(55,138,221,0.12)" : "transparent",
      }}
    >
      <span className="text-xs">{icon}</span>
      {label}
    </button>
  );
}
