"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { RepoGrid } from "@/components/RepoGrid";
import { PulseDashboard } from "@/components/PulseDashboard";
import { VersionButton } from "@/components/VersionButton";

export default function Home() {
  const [activeView, setActiveView] = useState<"repos" | "pulse">("repos");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "lastCommit">("lastCommit");
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  const handleSelectRepo = (fullName: string) => {
    setSelectedRepo(fullName);
    setActiveView("repos");
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0f1923" }}>
      {/* Left sidebar */}
      <Sidebar
        onSelectRepo={handleSelectRepo}
        selectedRepo={selectedRepo}
        onViewChange={setActiveView}
        activeView={activeView}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar
          search={search}
          onSearch={setSearch}
          sort={sort}
          onSort={setSort}
        />

        <main className="flex-1 overflow-auto p-4">
          {activeView === "repos" ? (
            <RepoGrid search={search} sort={sort} selectedRepo={selectedRepo} />
          ) : (
            <PulseDashboard repoFullName={selectedRepo} />
          )}
        </main>
      </div>

      {/* Version button — fixed top-right */}
      <VersionButton />
    </div>
  );
}
