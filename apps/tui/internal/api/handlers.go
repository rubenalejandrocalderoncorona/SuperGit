package api

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	gh "github.com/google/go-github/v68/github"
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
	// Catch-all OPTIONS handler so browser CORS preflights always get a 204.
	mux.HandleFunc("OPTIONS /", corsPreflightHandler)
	mux.HandleFunc("GET /api/health", withCORS(healthHandler))
	mux.HandleFunc("GET /api/version", withCORS(versionHandler))
	mux.HandleFunc("GET /api/repos", withCORS(reposHandler(cfg, ghc)))
	mux.HandleFunc("DELETE /api/repos/{owner}/{repo}", withCORS(deleteRepoHandler(ghc)))
	mux.HandleFunc("DELETE /api/repos/{name}", withCORS(deleteLocalRepoHandler))
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/commits", withCORS(commitsHandler(ghc)))
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/pulse", withCORS(pulseHandler(ghc)))
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/branches", withCORS(branchesHandler(ghc)))
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/heatmap", withCORS(heatmapHandler(ghc)))
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/readme", withCORS(readmeHandler(ghc)))
	mux.HandleFunc("GET /api/activity/heatmap", withCORS(userHeatmapHandler(ghc)))
	return mux
}

func corsPreflightHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS")
	w.WriteHeader(http.StatusNoContent)
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, HealthResponse{OK: true})
}

func versionHandler(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, VersionInfo{Version: Version, RepoURL: RepoURL})
}

func deleteRepoHandler(ghc *ghclient.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		owner := r.PathValue("owner")
		repo := r.PathValue("repo")
		log.Printf("DELETE repo: %s/%s", owner, repo)
		if err := ghc.DeleteRepo(r.Context(), owner, repo); err != nil {
			log.Printf("DELETE repo error: %s/%s — %v", owner, repo, err)
			errJSON(w, err.Error(), http.StatusBadGateway)
			return
		}
		log.Printf("DELETE repo success: %s/%s", owner, repo)
		hiddenMu.Lock()
		hiddenRepos[owner+"/"+repo] = true
		hiddenMu.Unlock()
		writeJSON(w, map[string]bool{"ok": true})
	}
}

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

		var days []CommitDay
		for i := 29; i >= 0; i-- {
			d := now.AddDate(0, 0, -i).Format("2006-01-02")
			days = append(days, CommitDay{Date: d, Count: dateCount[d]})
		}

		var bestWD time.Weekday
		var bestWDCount int
		for wd, cnt := range weekdayCount {
			if cnt > bestWDCount {
				bestWDCount = cnt
				bestWD = wd
			}
		}

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

// heatmapHandler returns 365-day per-repo commit heatmap data.
func heatmapHandler(ghc *ghclient.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		owner := r.PathValue("owner")
		repo := r.PathValue("repo")

		commits, err := ghc.CommitHistory(r.Context(), owner, repo, 365)
		if err != nil {
			errJSON(w, err.Error(), http.StatusBadGateway)
			return
		}

		dateCount := make(map[string]int, 365)
		now := time.Now()
		for i := 0; i < 365; i++ {
			d := now.AddDate(0, 0, -i).Format("2006-01-02")
			dateCount[d] = 0
		}
		for _, c := range commits {
			if cm := c.GetCommit(); cm != nil {
				if au := cm.GetAuthor(); au != nil {
					key := au.GetDate().Time.Format("2006-01-02")
					if _, ok := dateCount[key]; ok {
						dateCount[key]++
					}
				}
			}
		}

		writeJSON(w, buildHeatmap(dateCount, 365))
	}
}

// readmeHandler returns the raw markdown README for a repo.
func readmeHandler(ghc *ghclient.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		owner := r.PathValue("owner")
		repo := r.PathValue("repo")
		content, err := ghc.GetReadme(r.Context(), owner, repo)
		if err != nil {
			errJSON(w, err.Error(), http.StatusBadGateway)
			return
		}
		writeJSON(w, ReadmeContent{Content: content})
	}
}

// userHeatmapHandler returns the authenticated user's contribution heatmap
// across all repos for the past 365 days.
func userHeatmapHandler(ghc *ghclient.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		// Get the authenticated username.
		username, err := ghc.AuthenticatedUser(ctx)
		if err != nil {
			errJSON(w, err.Error(), http.StatusBadGateway)
			return
		}

		// Fetch user events (GitHub returns up to ~300 most recent events).
		events, err := ghc.UserActivity(ctx, username)
		if err != nil {
			errJSON(w, err.Error(), http.StatusBadGateway)
			return
		}

		// Pre-fill 365 days.
		dateCount := make(map[string]int, 365)
		now := time.Now()
		cutoff := now.AddDate(0, 0, -365)
		for i := 0; i < 365; i++ {
			d := now.AddDate(0, 0, -i).Format("2006-01-02")
			dateCount[d] = 0
		}

		// Extract PushEvent commit counts.
		for _, ev := range events {
			if ev.GetType() != "PushEvent" {
				continue
			}
			t := ev.GetCreatedAt().Time
			if t.Before(cutoff) {
				continue
			}
			key := t.Format("2006-01-02")
			if _, ok := dateCount[key]; ok {
				// Each PushEvent may carry several commits; use Size field.
				if payload, err := ev.ParsePayload(); err == nil {
					if push, ok := payload.(*gh.PushEvent); ok && push.Size != nil {
						dateCount[key] += *push.Size
					} else {
						dateCount[key]++
					}
				} else {
					dateCount[key]++
				}
			}
		}

		writeJSON(w, buildHeatmap(dateCount, 365))
	}
}

// buildHeatmap converts a date→count map into a sorted []HeatmapDay slice.
func buildHeatmap(dateCount map[string]int, days int) []HeatmapDay {
	maxCount := 1
	for _, cnt := range dateCount {
		if cnt > maxCount {
			maxCount = cnt
		}
	}

	keys := make([]string, 0, days)
	for d := range dateCount {
		keys = append(keys, d)
	}
	sort.Strings(keys)

	out := make([]HeatmapDay, 0, len(keys))
	for _, d := range keys {
		cnt := dateCount[d]
		intensity := 0
		if cnt > 0 {
			ratio := float64(cnt) / float64(maxCount)
			switch {
			case ratio >= 0.75:
				intensity = 4
			case ratio >= 0.40:
				intensity = 3
			case ratio >= 0.15:
				intensity = 2
			default:
				intensity = 1
			}
		}
		out = append(out, HeatmapDay{Date: d, Count: cnt, Intensity: intensity})
	}
	return out
}

// ── Utilities ────────────────────────────────────────────────────────────────

func firstLine(s string) string {
	if idx := strings.Index(s, "\n"); idx != -1 {
		return s[:idx]
	}
	return s
}

func normalizeGitURL(u string) string {
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

var _ = context.Background
