package api

import "time"

const Version = "v.0.0.5"
const RepoURL = "https://github.com/rubenalejandrocalderoncorona/SuperGit"

// Repo is the API representation of a repository.
type Repo struct {
	Name        string    `json:"name"`
	FullName    string    `json:"full_name"`
	Description string    `json:"description"`
	Language    string    `json:"language"`
	Stars       int       `json:"stars"`
	Forks       int       `json:"forks"`
	Branches    int       `json:"branches"`
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

// HeatmapDay is one cell in the yearly commit heatmap.
type HeatmapDay struct {
	Date      string `json:"date"`       // "YYYY-MM-DD"
	Count     int    `json:"count"`
	Intensity int    `json:"intensity"`  // 0–4 (0=none, 4=most)
}

// ReadmeContent is the response from GET /api/repos/{owner}/{repo}/readme.
type ReadmeContent struct {
	Content string `json:"content"` // raw markdown
}

// VersionInfo is the response from GET /api/version.
type VersionInfo struct {
	Version string `json:"version"`
	RepoURL string `json:"repo_url"`
}

// SettingsInfo is the request/response for GET and POST /api/settings.
type SettingsInfo struct {
	GitHubToken string `json:"github_token"` // masked on GET, plaintext on POST
	TokenHint   string `json:"token_hint"`   // last 4 chars shown on GET
}

// HealthResponse is the response from GET /api/health.
type HealthResponse struct {
	OK bool `json:"ok"`
}

// UserEntry is a safe-for-GET representation of a stored user (token masked).
type UserEntry struct {
	Username  string `json:"username"`
	TokenHint string `json:"token_hint"`
}

// UsersResponse is returned by GET /api/users.
type UsersResponse struct {
	Active string      `json:"active"`
	Users  []UserEntry `json:"users"`
}

// AddUserRequest is the body for POST /api/users.
type AddUserRequest struct {
	Username string `json:"username"`
	Token    string `json:"token"`
}
