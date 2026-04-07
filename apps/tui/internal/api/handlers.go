package api

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/rubenalejandrocalderoncorona/supergit/internal/config"
	"github.com/rubenalejandrocalderoncorona/supergit/internal/git"
	ghclient "github.com/rubenalejandrocalderoncorona/supergit/internal/github"
)

// hiddenRepos stores full_names of local-only repos the user has dismissed (in-memory, per session).
var (
	hiddenMu    sync.RWMutex
	hiddenRepos = make(map[string]bool)
)

// BuildMux registers all routes and returns the configured ServeMux.
func BuildMux(cfg *config.Config, ghc *ghclient.Client) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", withCORS(healthHandler))
	mux.HandleFunc("GET /api/version", withCORS(versionHandler))
	mux.HandleFunc("GET /api/repos", withCORS(reposHandler(cfg, ghc)))
	mux.HandleFunc("DELETE /api/repos/{owner}/{repo}", withCORS(deleteRepoHandler(ghc)))
	mux.HandleFunc("DELETE /api/repos/{name}", withCORS(deleteLocalRepoHandler))
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/commits", withCORS(commitsHandler(ghc)))
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/pulse", withCORS(pulseHandler(ghc)))
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/branches", withCORS(branchesHandler(ghc)))
	return mux
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, HealthResponse{OK: true})
}

func versionHandler(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, VersionInfo{Version: Version, RepoURL: RepoURL})
}

// deleteRepoHandler permanently deletes a GitHub repo via the API, then hides it locally.
func deleteRepoHandler(ghc *ghclient.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		owner := r.PathValue("owner")
		repo := r.PathValue("repo")
		if err := ghc.DeleteRepo(r.Context(), owner, repo); err != nil {
			errJSON(w, err.Error(), http.StatusBadGateway)
			return
		}
		// Also mark hidden so it won't reappear if the list is cached
		hiddenMu.Lock()
		hiddenRepos[owner+"/"+repo] = true
		hiddenMu.Unlock()
		writeJSON(w, map[string]bool{"ok": true})
	}
}

// deleteLocalRepoHandler hides a local-only repo (name) from the listing.
func deleteLocalRepoHandler(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	hiddenMu.Lock()
	hiddenRepos[name] = true
	hiddenMu.Unlock()
	writeJSON(w, map[string]bool{"ok": true})
}

func reposHandler(cfg *config.Config, ghc *ghclient.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		var result []Repo

		// GitHub repos
		ghRepos, err := ghc.ListRepos(ctx)
		if err == nil {
			for _, gr := range ghRepos {
				repo := Repo{
					Name:        gr.GetName(),
					FullName:    gr.GetFullName(),
					Description: gr.GetDescription(),
					Language:    gr.GetLanguage(),
					Stars:       gr.GetStargazersCount(),
					Forks:       gr.GetForksCount(),
					URL:         gr.GetHTMLURL(),
					Source:      "github",
				}
				if p := gr.GetPushedAt(); !p.IsZero() {
					repo.LastCommit = p.Time
				}
				result = append(result, repo)
			}
		}

		// Local repos — merge by remote URL to avoid duplicates
		existing := make(map[string]bool)
		for _, r := range result {
			existing[r.URL] = true
		}
		localRepos, _ := git.Scan(cfg.ScanDirs)
		for _, lr := range localRepos {
			normalURL := normalizeGitURL(lr.RemoteURL)
			if existing[normalURL] {
				continue
			}
			result = append(result, Repo{
				Name:      lr.Name,
				FullName:  lr.Name,
				Source:    "local",
				LocalPath: lr.Path,
				URL:       normalURL,
			})
		}

		// Filter out repos hidden this session.
		hiddenMu.RLock()
		filtered := result[:0]
		for _, repo := range result {
			key := repo.FullName
			if key == "" {
				key = repo.Name
			}
			if !hiddenRepos[key] {
				filtered = append(filtered, repo)
			}
		}
		hiddenMu.RUnlock()

		writeJSON(w, filtered)
	}
}

func commitsHandler(ghc *ghclient.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		owner := r.PathValue("owner")
		repo := r.PathValue("repo")
		commits, err := ghc.CommitHistory(r.Context(), owner, repo, 30)
		if err != nil {
			errJSON(w, err.Error(), http.StatusBadGateway)
			return
		}
		type CommitItem struct {
			SHA     string    `json:"sha"`
			Message string    `json:"message"`
			Author  string    `json:"author"`
			Date    time.Time `json:"date"`
		}
		var out []CommitItem
		for _, c := range commits {
			item := CommitItem{SHA: c.GetSHA()}
			if cm := c.GetCommit(); cm != nil {
				item.Message = firstLine(cm.GetMessage())
				if au := cm.GetAuthor(); au != nil {
					item.Author = au.GetName()
					item.Date = au.GetDate().Time
				}
			}
			out = append(out, item)
		}
		writeJSON(w, out)
	}
}

func pulseHandler(ghc *ghclient.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		owner := r.PathValue("owner")
		repo := r.PathValue("repo")

		commits, err := ghc.CommitHistory(r.Context(), owner, repo, 30)
		if err != nil {
			errJSON(w, err.Error(), http.StatusBadGateway)
			return
		}

		// Build date → count map
		dateCount := make(map[string]int)
		weekdayCount := make(map[time.Weekday]int)
		now := time.Now()
		for i := 0; i < 30; i++ {
			d := now.AddDate(0, 0, -i).Format("2006-01-02")
			dateCount[d] = 0
		}
		for _, c := range commits {
			if cm := c.GetCommit(); cm != nil {
				if au := cm.GetAuthor(); au != nil {
					t := au.GetDate().Time
					key := t.Format("2006-01-02")
					dateCount[key]++
					weekdayCount[t.Weekday()]++
				}
			}
		}

		// Build sorted slice (oldest first)
		var days []CommitDay
		for i := 29; i >= 0; i-- {
			d := now.AddDate(0, 0, -i).Format("2006-01-02")
			days = append(days, CommitDay{Date: d, Count: dateCount[d]})
		}

		// Most active weekday
		var bestWD time.Weekday
		var bestWDCount int
		for wd, cnt := range weekdayCount {
			if cnt > bestWDCount {
				bestWDCount = cnt
				bestWD = wd
			}
		}

		// Highest velocity 7-day window
		bestWindow := ""
		bestWindowCount := 0
		for i := 0; i <= 23; i++ {
			sum := 0
			for j := i; j < i+7 && j < 30; j++ {
				sum += days[j].Count
			}
			if sum > bestWindowCount {
				bestWindowCount = sum
				start := days[i].Date
				end := days[min(i+6, 29)].Date
				bestWindow = fmt.Sprintf("%s to %s", start, end)
			}
		}

		writeJSON(w, PulseData{
			CommitsByDay:          days,
			MostActiveDay:         bestWD.String(),
			HighestVelocityWindow: bestWindow,
			TotalCommits30d:       len(commits),
		})
	}
}

func branchesHandler(ghc *ghclient.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		owner := r.PathValue("owner")
		repo := r.PathValue("repo")
		count, err := ghc.BranchCount(r.Context(), owner, repo)
		if err != nil {
			errJSON(w, err.Error(), http.StatusBadGateway)
			return
		}
		writeJSON(w, map[string]int{"count": count})
	}
}

func firstLine(s string) string {
	if idx := strings.Index(s, "\n"); idx != -1 {
		return s[:idx]
	}
	return s
}

func normalizeGitURL(u string) string {
	// Convert git@github.com:user/repo.git → https://github.com/user/repo
	u = strings.TrimSuffix(u, ".git")
	if strings.HasPrefix(u, "git@github.com:") {
		u = "https://github.com/" + strings.TrimPrefix(u, "git@github.com:")
	}
	return u
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// ensure context is used (suppress lint warnings)
var _ = context.Background
