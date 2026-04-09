const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8765";

export interface Repo {
  name: string;
  full_name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  last_commit: string;
  url: string;
  source: "github" | "local";
  local_path: string;
}

export interface CommitDay {
  date: string;
  count: number;
}

export interface PulseData {
  commits_by_day: CommitDay[];
  most_active_day: string;
  highest_velocity_window: string;
  total_commits_30d: number;
}

export interface VersionInfo {
  version: string;
  repo_url: string;
}

export interface HeatmapDay {
  date: string;
  count: number;
  intensity: number; // 0–4
}

export async function fetchRepos(): Promise<Repo[]> {
  const r = await fetch(`${BASE}/api/repos`, { cache: "no-store" });
  if (!r.ok) throw new Error(`fetchRepos: ${r.status}`);
  return r.json();
}

export async function fetchPulse(
  owner: string,
  repo: string
): Promise<PulseData> {
  const r = await fetch(`${BASE}/api/repos/${owner}/${repo}/pulse`, {
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`fetchPulse: ${r.status}`);
  return r.json();
}

export async function fetchVersion(): Promise<VersionInfo> {
  const r = await fetch(`${BASE}/api/version`, { cache: "no-store" });
  if (!r.ok) throw new Error(`fetchVersion: ${r.status}`);
  return r.json();
}

export async function deleteRepo(fullName: string): Promise<void> {
  const parts = fullName.split("/");
  const path =
    parts.length === 2
      ? `${BASE}/api/repos/${parts[0]}/${parts[1]}`
      : `${BASE}/api/repos/${fullName}`;
  const r = await fetch(path, { method: "DELETE" });
  if (!r.ok) throw new Error(`deleteRepo: ${r.status}`);
}

export async function fetchBranchCount(owner: string, repo: string): Promise<number> {
  const r = await fetch(`${BASE}/api/repos/${owner}/${repo}/branches`, { cache: "no-store" });
  if (!r.ok) throw new Error(`fetchBranchCount: ${r.status}`);
  const data: { count: number } = await r.json();
  return data.count;
}

export async function fetchHeatmap(owner: string, repo: string): Promise<HeatmapDay[]> {
  const r = await fetch(`${BASE}/api/repos/${owner}/${repo}/heatmap`, { cache: "no-store" });
  if (!r.ok) throw new Error(`fetchHeatmap: ${r.status}`);
  return r.json();
}
