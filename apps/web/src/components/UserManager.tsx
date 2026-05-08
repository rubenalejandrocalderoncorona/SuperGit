"use client";

import { useEffect, useState } from "react";
import {
  fetchUsers,
  addUser,
  deleteUser,
  activateUser,
  type UsersResponse,
} from "@/lib/api";

export function UserManager() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [addUsername, setAddUsername] = useState("");
  const [addToken, setAddToken] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const refresh = () =>
    fetchUsers()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => { refresh(); }, []);

  const handleActivate = async (username: string) => {
    setActivating(username);
    setError(null);
    try {
      await activateUser(username);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to activate");
    } finally {
      setActivating(null);
    }
  };

  const handleDelete = async (username: string) => {
    setDeleting(username);
    setError(null);
    try {
      await deleteUser(username);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove");
    } finally {
      setDeleting(null);
    }
  };

  const handleAdd = async () => {
    if (!addUsername.trim() || !addToken.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      await addUser(addUsername.trim(), addToken.trim());
      setAddUsername("");
      setAddToken("");
      await refresh();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to add user");
    } finally {
      setAdding(false);
    }
  };

  const inputStyle = {
    background: "var(--sg-input-bg)",
    border: "1px solid var(--sg-border-dim)",
    color: "var(--sg-text)",
  } as const;

  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).style.borderColor = "var(--sg-accent)";
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).style.borderColor = "var(--sg-border-dim)";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-8">
      <div>
        <h1 className="text-xl font-bold mb-0.5" style={{ color: "var(--sg-text)" }}>
          Users
        </h1>
        <p className="text-xs" style={{ color: "var(--sg-muted)" }}>
          Manage GitHub accounts · switching active user applies globally
        </p>
      </div>

      {error && (
        <div
          className="text-xs px-3 py-2 rounded-lg"
          style={{
            background: "rgba(220,53,69,0.1)",
            border: "1px solid rgba(220,53,69,0.3)",
            color: "#e05c6a",
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* User list */}
      <div
        className="glass"
        style={{ borderRadius: 11, boxShadow: "var(--sg-card-shadow)" }}
      >
        <div className="px-5 py-3 border-b" style={{ borderColor: "var(--sg-border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--sg-muted)" }}>
            Saved accounts
          </h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm" style={{ color: "var(--sg-dim)" }}>Loading…</p>
        ) : !data || data.users.length === 0 ? (
          <p className="px-5 py-4 text-sm" style={{ color: "var(--sg-dim)" }}>
            No accounts saved yet. Add one below.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--sg-border)" }}>
            {data.users.map((u) => {
              const isActive = u.username === data.active;
              return (
                <li key={u.username} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: "var(--sg-text)" }}>
                        {u.username}
                      </span>
                      {isActive && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-semibold"
                          style={{
                            background: "rgba(55,138,221,0.15)",
                            color: "var(--sg-accent)",
                            border: "1px solid rgba(55,138,221,0.3)",
                          }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono mt-0.5 block" style={{ color: "var(--sg-dim)" }}>
                      {u.token_hint}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isActive && (
                      <button
                        onClick={() => handleActivate(u.username)}
                        disabled={activating === u.username}
                        className="text-xs px-3 py-1.5 rounded-lg transition-all font-medium"
                        style={{
                          color: "var(--sg-accent)",
                          border: "1px solid rgba(55,138,221,0.4)",
                          background: activating === u.username
                            ? "rgba(55,138,221,0.05)"
                            : "transparent",
                          cursor: activating === u.username ? "not-allowed" : "pointer",
                          opacity: activating === u.username ? 0.6 : 1,
                        }}
                      >
                        {activating === u.username ? "Activating…" : "Activate"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(u.username)}
                      disabled={deleting === u.username}
                      className="text-xs px-3 py-1.5 rounded-lg transition-all"
                      style={{
                        color: "#e05c6a",
                        border: "1px solid rgba(220,53,69,0.3)",
                        background: deleting === u.username
                          ? "rgba(220,53,69,0.05)"
                          : "transparent",
                        cursor: deleting === u.username ? "not-allowed" : "pointer",
                        opacity: deleting === u.username ? 0.6 : 1,
                      }}
                    >
                      {deleting === u.username ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Add user form */}
      <div
        className="glass p-5"
        style={{ borderRadius: 11, boxShadow: "var(--sg-card-shadow)" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--sg-muted)" }}>
          Add account
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--sg-muted)" }}>
              GitHub username
            </label>
            <input
              type="text"
              placeholder="octocat"
              value={addUsername}
              onChange={(e) => { setAddUsername(e.target.value); setAddError(null); }}
              className="w-full px-3 py-2 text-sm rounded-lg outline-none"
              style={inputStyle}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--sg-muted)" }}>
              Personal access token
            </label>
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={addToken}
              onChange={(e) => { setAddToken(e.target.value); setAddError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              className="w-full px-3 py-2 text-sm rounded-lg outline-none font-mono"
              style={inputStyle}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
            <p className="text-xs mt-1.5" style={{ color: "var(--sg-dim)" }}>
              Requires scopes:{" "}
              <code style={{ color: "var(--sg-muted)" }}>repo</code>,{" "}
              <code style={{ color: "var(--sg-muted)" }}>read:user</code>
            </p>
          </div>

          {addError && (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                background: "rgba(220,53,69,0.1)",
                border: "1px solid rgba(220,53,69,0.3)",
                color: "#e05c6a",
              }}
            >
              ⚠ {addError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleAdd}
              disabled={adding || !addUsername.trim() || !addToken.trim()}
              className="text-xs px-4 py-2 rounded-lg font-semibold transition-all"
              style={{
                color: "#fff",
                background:
                  adding || !addUsername.trim() || !addToken.trim()
                    ? "rgba(55,138,221,0.3)"
                    : "rgba(55,138,221,0.85)",
                border: "1px solid rgba(55,138,221,0.5)",
                cursor:
                  adding || !addUsername.trim() || !addToken.trim()
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {adding ? "Validating…" : "Add account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
