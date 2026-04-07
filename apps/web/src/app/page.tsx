"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { RepoGrid } from "@/components/RepoGrid";
import { PulseDashboard } from "@/components/PulseDashboard";

export default function Home() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activeView, setActiveView] = useState<"repos" | "pulse">("repos");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "lastCommit">("lastCommit");
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleSelectRepo = (fullName: string) => {
    setSelectedRepo(fullName);
    setActiveView("repos");
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--sg-bg)" }}>
      <Sidebar
        onSelectRepo={handleSelectRepo}
        selectedRepo={selectedRepo}
        onViewChange={setActiveView}
        activeView={activeView}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === "dark" ? "light" : "dark")}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        {activeView === "repos" && (
          <TopBar
            search={search}
            onSearch={setSearch}
            sort={sort}
            onSort={setSort}
          />
        )}

        <main className="flex-1 overflow-auto p-4">
          {activeView === "repos" ? (
            <RepoGrid search={search} sort={sort} selectedRepo={selectedRepo} />
          ) : (
            <PulseDashboard />
          )}
        </main>
      </div>
    </div>
  );
}
