package api

import "time"

const Version = "v1.0.0"
const RepoURL = "https://github.com/rubenalejandrocalderoncorona/SuperGit"

// Repo is the API representation of a repository.
type Repo struct {
	Name        string    `json:"name"`
	FullName    string    `json:"full_name"`
	Description string    `json:"description"`
	Language    string    `json:"language"`
	Stars       int       `json:"stars"`
	Forks       int       `json:"forks"`
	LastCommit  time.Time `json:"last_commit"`
	URL         string    `json:"url"`
	Source      string    `json:"source"`    // "github" | "local"
	LocalPath   string    `json:"local_path"` // populated for source="local"
}

// CommitDay is one data point in the pulse chart.
type CommitDay struct {
	Date  string `json:"date"`  // "YYYY-MM-DD"
	Count int    `json:"count"`
}

// PulseData is the response from GET /api/repos/{owner}/{repo}/pulse.
type PulseData struct {
	CommitsByDay           []CommitDay `json:"commits_by_day"`
	MostActiveDay          string      `json:"most_active_day"`
	HighestVelocityWindow  string      `json:"highest_velocity_window"`
	TotalCommits30d        int         `json:"total_commits_30d"`
}

// VersionInfo is the response from GET /api/version.
type VersionInfo struct {
	Version string `json:"version"`
	RepoURL string `json:"repo_url"`
}

// HealthResponse is the response from GET /api/health.
type HealthResponse struct {
	OK bool `json:"ok"`
}
