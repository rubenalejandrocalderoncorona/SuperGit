"use client";

import { useEffect, useState } from "react";
import { fetchSettings, saveSettings } from "@/lib/api";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export function SettingsModal({ onClose, onSaved }: Props) {
  const [tokenHint, setTokenHint] = useState("");
  const [newToken, setNewToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings()
      .then((s) => setTokenHint(s.token_hint ?? ""))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!newToken.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await saveSettings(newToken.trim());
      setSuccess(true);
      setNewToken("");
      // Re-fetch hint to reflect new token.
      fetchSettings().then((s) => setTokenHint(s.token_hint ?? "")).catch(() => {});
      setTimeout(() => {
        onSaved();
        onClose();
      }, 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="glass flex flex-col gap-5 p-6 w-full max-w-md"
        style={{
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          border: "1px solid var(--sg-border-dim)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: "var(--sg-text)" }}>
            Settings
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-all"
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
            ✕
          </button>
        </div>

        {/* Current token */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--sg-muted)" }}>
            GitHub Personal Access Token
          </label>
          {tokenHint && (
            <div
              className="text-xs px-3 py-2 rounded-lg mb-3 font-mono"
              style={{
                background: "var(--sg-surface)",
                border: "1px solid var(--sg-border)",
                color: "var(--sg-dim)",
              }}
            >
              Current: {tokenHint}
            </div>
          )}
          <input
            type="password"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={newToken}
            onChange={(e) => { setNewToken(e.target.value); setError(null); setSuccess(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            className="w-full px-3 py-2 text-sm rounded-lg outline-none font-mono"
            style={{
              background: "var(--sg-input-bg)",
              border: "1px solid var(--sg-border-dim)",
              color: "var(--sg-text)",
            }}
            onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--sg-accent)"; }}
            onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--sg-border-dim)"; }}
            autoFocus
          />
          <p className="text-xs mt-1.5" style={{ color: "var(--sg-dim)" }}>
            Requires scopes: <code style={{ color: "var(--sg-muted)" }}>repo</code>,{" "}
            <code style={{ color: "var(--sg-muted)" }}>read:user</code>
          </p>
        </div>

        {/* Error / success */}
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

        {success && (
          <div
            className="text-xs px-3 py-2 rounded-lg"
            style={{
              background: "rgba(55,138,221,0.1)",
              border: "1px solid rgba(55,138,221,0.3)",
              color: "var(--sg-accent)",
            }}
          >
            ✓ Token updated successfully
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-lg transition-all"
            style={{
              color: "var(--sg-muted)",
              border: "1px solid var(--sg-border)",
              background: "transparent",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !newToken.trim()}
            className="text-xs px-4 py-2 rounded-lg font-semibold transition-all"
            style={{
              color: "#fff",
              background: saving || !newToken.trim()
                ? "rgba(55,138,221,0.3)"
                : "rgba(55,138,221,0.85)",
              border: "1px solid rgba(55,138,221,0.5)",
              cursor: saving || !newToken.trim() ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Validating…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
