"use client";

import { useEffect, useState } from "react";
import { marked } from "marked";
import { fetchReadme, fetchBranchCount, type Repo } from "@/lib/api";
import { CommitHeatmap } from "@/components/CommitHeatmap";

interface Props {
  repo: Repo;
  onBack: () => void;
}

const LANG_COLORS: Record<string, string> = {
  Go: "#00ADD8",
  TypeScript: "#3178C6",
  JavaScript: "#F7DF1E",
  Python: "#3572A5",
  Rust: "#DEA584",
  Ruby: "#CC342D",
  Swift: "#F05138",
  "C++": "#f34b7d",
  Java: "#b07219",
  Kotlin: "#A97BFF",
  Shell: "#89e051",
};

function formatRelative(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function RepoDetail({ repo, onBack }: Props) {
  const [readme, setReadme] = useState<string | null>(null);
  const [readmeHtml, setReadmeHtml] = useState<string>("");
  const [branches, setBranches] = useState<number | null>(null);
  const [readmeLoading, setReadmeLoading] = useState(true);

  const isGitHub = repo.source === "github" && repo.full_name.includes("/");
  const [owner, name] = isGitHub ? repo.full_name.split("/") : ["", ""];

  useEffect(() => {
    if (!isGitHub) {
      setReadmeLoading(false);
      return;
    }
    setReadmeLoading(true);
    Promise.all([
      fetchReadme(owner, name).catch(() => null),
      fetchBranchCount(owner, name).catch(() => null),
    ]).then(([rm, br]) => {
      setBranches(br);
      if (rm) {
        setReadme(rm.content);
        setReadmeHtml(marked.parse(rm.content) as string);
      }
    }).finally(() => setReadmeLoading(false));
  }, [repo.full_name, isGitHub, owner, name]);

  const langColor = LANG_COLORS[repo.language] ?? "var(--sg-muted)";

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-8">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all"
          style={{
            color: "var(--sg-muted)",
            background: "transparent",
            border: "1px solid var(--sg-border)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--sg-accent)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--sg-accent)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--sg-muted)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--sg-border)";
          }}
        >
          ← Back
        </button>

        <h1 className="text-xl font-bold" style={{ color: "var(--sg-text)" }}>
          {repo.name}
        </h1>

        {repo.language && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ color: langColor, background: langColor + "22" }}
          >
            {repo.language}
          </span>
        )}

        {repo.source === "local" && (
          <span
            className="text-xs px-2 py-0.5 rounded font-mono"
            style={{ background: "var(--sg-local-bg)", color: "var(--sg-muted)" }}
          >
            local
          </span>
        )}

        <span className="flex-1" />

        {repo.url && (
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{
              color: "var(--sg-accent)",
              border: "1px solid var(--sg-accent)",
              textDecoration: "none",
            }}
          >
            Open on GitHub ↗
          </a>
        )}
      </div>

      {/* ── Description ── */}
      {repo.description && (
        <p className="text-sm" style={{ color: "var(--sg-muted)" }}>
          {repo.description}
        </p>
      )}

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Stars" value={repo.stars?.toLocaleString() ?? "—"} icon="★" />
        <StatCard label="Forks" value={repo.forks?.toLocaleString() ?? "—"} icon="⑂" />
        <StatCard label="Branches" value={branches !== null ? String(branches) : "—"} icon="⎇" />
        <StatCard label="Last push" value={formatRelative(repo.last_commit)} icon="◷" />
      </div>

      {/* ── Commit heatmap ── */}
      {isGitHub && (
        <section>
          <div
            className="glass p-4"
            style={{ borderRadius: 11, boxShadow: "var(--sg-card-shadow)" }}
          >
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--sg-muted)" }}>
              Commits · 365 days
            </h2>
            <div style={{ overflowX: "auto" }}>
              <CommitHeatmap owner={owner} repo={name} />
            </div>
          </div>
        </section>
      )}

      {/* ── README ── */}
      <section>
        <div
          className="glass p-5"
          style={{ borderRadius: 11, boxShadow: "var(--sg-card-shadow)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--sg-muted)" }}>
            README
          </h2>

          {!isGitHub && (
            <p className="text-sm" style={{ color: "var(--sg-dim)" }}>
              README not available for local repositories.
            </p>
          )}

          {isGitHub && readmeLoading && (
            <p className="text-sm" style={{ color: "var(--sg-dim)" }}>Loading…</p>
          )}

          {isGitHub && !readmeLoading && !readme && (
            <p className="text-sm" style={{ color: "var(--sg-dim)" }}>No README found.</p>
          )}

          {isGitHub && !readmeLoading && readme && (
            <div
              className="sg-readme"
              dangerouslySetInnerHTML={{ __html: readmeHtml }}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div
      className="glass p-4 flex flex-col gap-1"
      style={{ borderRadius: 11, boxShadow: "var(--sg-card-shadow)" }}
    >
      <div className="text-xs flex items-center gap-1" style={{ color: "var(--sg-muted)" }}>
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-xl font-bold" style={{ color: "var(--sg-accent)" }}>
        {value}
      </div>
    </div>
  );
}
