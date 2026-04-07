"use client";

import { useEffect, useState } from "react";
import { fetchRepos, deleteRepo, type Repo } from "@/lib/api";
import { RepoCard } from "./RepoCard";

interface RepoGridProps {
  search: string;
  sort: "name" | "lastCommit";
  selectedRepo: string | null;
}

export function RepoGrid({ search, sort, selectedRepo }: RepoGridProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchRepos()
      .then(setRepos)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (fullName: string) => {
    setDeleteError(null);
    try {
      await deleteRepo(fullName);
      // Only remove from UI after confirmed server success
      setRepos((prev) => prev.filter((r) => (r.full_name || r.name) !== fullName));
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Delete failed");
      // Auto-clear after 5s
      setTimeout(() => setDeleteError(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm" style={{ color: "var(--sg-muted)" }}>
        Loading repositories…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <span className="text-2xl">⚠</span>
        <p className="text-sm" style={{ color: "var(--sg-warning)" }}>
          Could not connect to SuperGit server
        </p>
        <p className="text-xs" style={{ color: "var(--sg-muted)" }}>
          Start the server:{" "}
          <code className="px-2 py-0.5 rounded" style={{ background: "var(--sg-surface)" }}>
            cd apps/tui &amp;&amp; go run ./cmd/server
          </code>
        </p>
      </div>
    );
  }

  const filtered = repos.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.description ?? "").toLowerCase().includes(q) ||
      (r.language ?? "").toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    const da = new Date(a.last_commit).getTime() || 0;
    const db = new Date(b.last_commit).getTime() || 0;
    return db - da;
  });

  return (
    <div>
      {/* Delete error toast */}
      {deleteError && (
        <div
          className="mb-3 px-4 py-2.5 rounded-lg text-xs flex items-center gap-2"
          style={{
            background: "rgba(220,53,69,0.1)",
            border: "1px solid rgba(220,53,69,0.35)",
            color: "#e05c6a",
          }}
        >
          <span>⚠</span>
          <span className="flex-1">{deleteError}</span>
          <button
            onClick={() => setDeleteError(null)}
            style={{ color: "inherit", opacity: 0.6 }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="text-xs mb-3" style={{ color: "var(--sg-dim)" }}>
        {sorted.length} repositories{search && ` matching "${search}"`}
      </div>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((r) => (
          <RepoCard
            key={r.full_name || r.name}
            repo={r}
            selected={selectedRepo === r.full_name}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="text-center text-sm py-12" style={{ color: "var(--sg-muted)" }}>
          No repositories match your search.
        </div>
      )}
    </div>
  );
}
