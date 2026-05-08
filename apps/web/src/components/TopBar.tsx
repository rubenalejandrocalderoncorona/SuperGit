"use client";

interface TopBarProps {
  search: string;
  onSearch: (v: string) => void;
  sort: "name" | "lastCommit";
  onSort: (v: "name" | "lastCommit") => void;
}

export function TopBar({ search, onSearch, sort, onSort }: TopBarProps) {
  return (
    <header
      className="flex items-center gap-3 px-4 py-2 glass border-b shrink-0"
      style={{ borderColor: "var(--sg-border)" }}
    >
      <div className="relative flex-1">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
          style={{ color: "var(--sg-muted)" }}
        >
          ⌕
        </span>
        <input
          type="text"
          placeholder="Search repositories…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm outline-none transition-all"
          style={{
            background: "var(--sg-input-bg)",
            border: "1px solid var(--sg-border-dim)",
            color: "var(--sg-text)",
          }}
          onFocus={(e) => {
            (e.target as HTMLInputElement).style.borderColor = "var(--sg-accent)";
          }}
          onBlur={(e) => {
            (e.target as HTMLInputElement).style.borderColor = "var(--sg-border-dim)";
          }}
        />
      </div>

      <select
        value={sort}
        onChange={(e) => onSort(e.target.value as "name" | "lastCommit")}
        className="px-3 py-1.5 rounded-lg text-sm outline-none cursor-pointer"
        style={{
          background: "var(--sg-input-bg)",
          border: "1px solid var(--sg-border-dim)",
          color: "var(--sg-text)",
        }}
      >
        <option value="lastCommit">Sort: Last Committed</option>
        <option value="name">Sort: Name A–Z</option>
      </select>
    </header>
  );
}
