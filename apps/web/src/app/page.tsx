"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { RepoGrid } from "@/components/RepoGrid";
import { PulseDashboard } from "@/components/PulseDashboard";
import { RepoDetail } from "@/components/RepoDetail";
import { ActivityView } from "@/components/ActivityView";
import { fetchRepos, type Repo } from "@/lib/api";

type View = "repos" | "pulse" | "repo-detail" | "activity";

export default function Home() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activeView, setActiveView] = useState<View>("repos");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "lastCommit">("lastCommit");
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [selectedRepoObj, setSelectedRepoObj] = useState<Repo | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);

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
  };

  const handleViewChange = (view: "repos" | "pulse" | "activity") => {
    setActiveView(view);
    setSelectedRepo(null);
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--sg-bg)" }}>
      <Sidebar
        onSelectRepo={handleSelectRepo}
        selectedRepo={selectedRepo}
        onViewChange={handleViewChange}
        activeView={activeView}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        {activeView === "repos" && (
          <TopBar search={search} onSearch={setSearch} sort={sort} onSort={setSort} />
        )}

        <main className="flex-1 overflow-auto p-4">
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
    </div>
  );
}
