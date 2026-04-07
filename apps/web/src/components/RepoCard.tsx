import { useState } from "react";
import type { Repo } from "@/lib/api";

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

interface RepoCardProps {
  repo: Repo;
  selected?: boolean;
  onClick?: () => void;
  onDelete?: (fullName: string) => void;
}

export function RepoCard({ repo, selected, onClick, onDelete }: RepoCardProps) {
  const [hovered, setHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const langColor = LANG_COLORS[repo.language] ?? "var(--sg-muted)";

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete?.(repo.full_name || repo.name);
    } else {
      setConfirmDelete(true);
    }
  };

  return (
    <article
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
      className="glass p-4 cursor-pointer transition-all duration-200 relative"
      style={{
        borderRadius: 11,
        boxShadow: selected
          ? "0 4px 24px rgba(55,138,221,0.2)"
          : "var(--sg-card-shadow)",
        borderColor: selected ? "var(--sg-accent)" : "var(--sg-border)",
        outline: selected ? "1px solid rgba(55,138,221,0.3)" : "none",
      }}
    >
      {/* Delete button — appears on hover */}
      {onDelete && hovered && (
        <button
          onClick={handleDeleteClick}
          title={confirmDelete ? "Click again to confirm" : "Hide this repository"}
          className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full transition-all duration-150"
          style={{
            background: confirmDelete
              ? "rgba(220,53,69,0.18)"
              : "rgba(120,120,130,0.15)",
            color: confirmDelete ? "#e05c6a" : "var(--sg-dim)",
            border: `1px solid ${confirmDelete ? "rgba(220,53,69,0.4)" : "var(--sg-border)"}`,
          }}
        >
          {confirmDelete ? "confirm?" : "✕"}
        </button>
      )}

      {/* Name + language */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3
          className="font-semibold truncate text-sm"
          style={{ color: "var(--sg-text)" }}
        >
          {repo.name}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0" style={{ marginRight: onDelete && hovered ? 40 : 0 }}>
          {repo.source === "local" && (
            <span
              className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{ background: "var(--sg-local-bg)", color: "var(--sg-muted)" }}
            >
              local
            </span>
          )}
          {repo.language && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ color: langColor, background: langColor + "22" }}
            >
              {repo.language}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {repo.description && (
        <p className="text-xs mb-2 line-clamp-2" style={{ color: "var(--sg-muted)" }}>
          {repo.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs" style={{ color: "var(--sg-dim)" }}>
        <span>★ {repo.stars.toLocaleString()}</span>
        <span>⑂ {repo.forks.toLocaleString()}</span>
        {repo.last_commit && <span>{formatRelativeTime(repo.last_commit)}</span>}
        <a
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs hover:underline transition-colors"
          style={{ color: "var(--sg-accent)" }}
          onClick={(e) => e.stopPropagation()}
        >
          Open ↗
        </a>
      </div>
    </article>
  );
}

function formatRelativeTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
