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
