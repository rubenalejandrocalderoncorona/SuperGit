"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { RepoGrid } from "@/components/RepoGrid";
import { PulseDashboard } from "@/components/PulseDashboard";
import { RepoDetail } from "@/components/RepoDetail";
import { ActivityView } from "@/components/ActivityView";
import { SettingsModal } from "@/components/SettingsModal";
import { UserManager } from "@/components/UserManager";
import { fetchRepos, type Repo } from "@/lib/api";

type View = "repos" | "pulse" | "repo-detail" | "activity" | "users";

export default function Home() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activeView, setActiveView] = useState<View>("repos");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "lastCommit">("lastCommit");
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [selectedRepoObj, setSelectedRepoObj] = useState<Repo | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    fetchRepos().then(setRepos).catch(() => {});
  }, []);

  const handleSelectRepo = (fullName: string) => {
    setSelectedRepo(fullName);
    const repo = repos.find((r) => (r.full_name || r.name) === fullName) ?? null;
    setSelectedRepoObj(repo);
    setActiveView("repo-detail");
    setSidebarOpen(false);
  };

  const handleViewChange = (view: "repos" | "pulse" | "activity" | "users") => {
    setActiveView(view);
    setSelectedRepo(null);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--sg-bg)" }}>
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSaved={() => {
            fetchRepos().then(setRepos).catch(() => {});
            setActiveView("repos");
            setSelectedRepo(null);
          }}
        />
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless open, always visible on md+ */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 transition-transform duration-200
          md:relative md:translate-x-0 md:flex md:shrink-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar
          onSelectRepo={handleSelectRepo}
          selectedRepo={selectedRepo}
          onViewChange={handleViewChange}
          activeView={activeView}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          onOpenSettings={() => { setShowSettings(true); setSidebarOpen(false); }}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Mobile top bar with hamburger */}
        <div
          className="flex items-center gap-2 px-3 py-2 border-b md:hidden shrink-0"
          style={{ borderColor: "var(--sg-border)", background: "var(--sg-surface)" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-base"
            style={{ color: "var(--sg-muted)" }}
          >
            ☰
          </button>
          <span className="text-sm font-semibold" style={{ color: "var(--sg-accent)" }}>
            SuperGit
          </span>
          <span className="flex-1" />
          <button
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-sm"
            style={{ color: "var(--sg-muted)" }}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-sm"
            style={{ color: "var(--sg-muted)" }}
          >
            ⚙
          </button>
        </div>

        {activeView === "repos" && (
          <TopBar search={search} onSearch={setSearch} sort={sort} onSort={setSort} />
        )}

        <main className="flex-1 overflow-auto p-3 md:p-4 pb-20 md:pb-4">
          {activeView === "repos" && (
            <RepoGrid
              search={search}
              sort={sort}
              selectedRepo={selectedRepo}
              onSelectRepo={handleSelectRepo}
            />
          )}
          {activeView === "pulse" && <PulseDashboard />}
          {activeView === "activity" && <ActivityView />}
          {activeView === "users" && <UserManager />}
          {activeView === "repo-detail" && selectedRepoObj && (
            <RepoDetail
              repo={selectedRepoObj}
              onBack={() => setActiveView("repos")}
            />
          )}
          {activeView === "repo-detail" && !selectedRepoObj && (
            <div
              className="flex items-center justify-center h-full text-sm"
              style={{ color: "var(--sg-muted)" }}
            >
              Select a repository to view details
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 py-2 md:hidden border-t"
        style={{
          background: "var(--sg-surface)",
          borderColor: "var(--sg-border)",
        }}
      >
        {(
          [
            { view: "repos", icon: "⊞", label: "Repos" },
            { view: "pulse", icon: "◆", label: "Pulse" },
            { view: "activity", icon: "◈", label: "Activity" },
            { view: "users", icon: "⊙", label: "Users" },
          ] as const
        ).map(({ view, icon, label }) => {
          const active =
            activeView === view ||
            (view === "repos" && activeView === "repo-detail");
          return (
            <button
              key={view}
              onClick={() => handleViewChange(view)}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors"
              style={{
                color: active ? "var(--sg-accent)" : "var(--sg-muted)",
                background: active ? "rgba(55,138,221,0.1)" : "transparent",
              }}
            >
              <span className="text-base leading-none">{icon}</span>
              <span className="text-[10px] leading-none">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
