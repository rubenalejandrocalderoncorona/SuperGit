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

// Modal rendered via a portal-style fixed overlay
function DeleteModal({
  repoName,
  onConfirm,
  onCancel,
}: {
  repoName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
    >
      <div
        className="glass flex flex-col gap-4 p-6"
        style={{
          borderRadius: 14,
          width: 360,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          borderColor: "rgba(220,53,69,0.35)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          style={{ background: "rgba(220,53,69,0.12)", color: "#e05c6a" }}
        >
          ✕
        </div>

        {/* Text */}
        <div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--sg-text)" }}>
            Delete repository
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: "var(--sg-muted)" }}>
            This will permanently delete{" "}
            <span style={{ color: "var(--sg-text)", fontWeight: 600 }}>{repoName}</span>{" "}
            from GitHub. This action cannot be undone.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="text-xs px-4 py-2 rounded-lg transition-all duration-150"
            style={{
              color: "var(--sg-muted)",
              border: "1px solid var(--sg-border)",
              background: "transparent",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="text-xs px-4 py-2 rounded-lg font-semibold transition-all duration-150"
            style={{
              color: "#fff",
              background: "rgba(220,53,69,0.8)",
              border: "1px solid rgba(220,53,69,0.5)",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function RepoCard({ repo, selected, onClick, onDelete }: RepoCardProps) {
  const [hovered, setHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const langColor = LANG_COLORS[repo.language] ?? "var(--sg-muted)";

  return (
    <>
      {showModal && (
        <DeleteModal
          repoName={repo.name}
          onConfirm={() => {
            setShowModal(false);
            onDelete?.(repo.full_name || repo.name);
          }}
          onCancel={() => setShowModal(false)}
        />
      )}

      <article
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
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
        {/* ✕ button — top-right, only on hover */}
        {onDelete && hovered && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
            title="Delete repository"
            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-xs transition-all duration-150"
            style={{
              background: "rgba(220,53,69,0.12)",
              color: "var(--sg-dim)",
              border: "1px solid transparent",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.color = "#e05c6a";
              el.style.borderColor = "rgba(220,53,69,0.4)";
              el.style.background = "rgba(220,53,69,0.2)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.color = "var(--sg-dim)";
              el.style.borderColor = "transparent";
              el.style.background = "rgba(220,53,69,0.12)";
            }}
          >
            ✕
          </button>
        )}

        {/* Name + language */}
        <div className="flex items-start justify-between gap-2 mb-1" style={{ paddingRight: hovered && onDelete ? 28 : 0 }}>
          <h3
            className="font-semibold truncate text-sm"
            style={{ color: "var(--sg-text)" }}
          >
            {repo.name}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
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
        <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: "var(--sg-dim)" }}>
          {repo.last_commit && (
            <span title="Last commit">
              ◷ {formatRelativeTime(repo.last_commit)}
            </span>
          )}
          {repo.last_commit && (
            <span title="Commit date" style={{ color: "var(--sg-dim)", opacity: 0.7 }}>
              {formatDate(repo.last_commit)}
            </span>
          )}
          <span title="Forks">⑂ {repo.forks.toLocaleString()}</span>
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
    </>
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

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
