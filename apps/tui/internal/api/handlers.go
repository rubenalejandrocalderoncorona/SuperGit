package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	gh "github.com/google/go-github/v68/github"
	"github.com/rubenalejandrocalderoncorona/supergit/internal/config"
	"github.com/rubenalejandrocalderoncorona/supergit/internal/git"
	ghclient "github.com/rubenalejandrocalderoncorona/supergit/internal/github"
)

// ensure gh import is used
var _ *gh.RepositoryCommit

// hiddenRepos stores full_names of repos hidden this session.
var (
	hiddenMu    sync.RWMutex
	hiddenRepos = make(map[string]bool)
)

// activeClient is the hot-swappable GitHub client, replaced when credentials change.
var activeClient atomic.Pointer[ghclient.Client]

// activeCfg holds the current config for the settings handlers.
var (
	activeCfgMu sync.RWMutex
	activeCfg   *config.Config
)

// BuildMux registers all routes and returns the configured ServeMux.
func BuildMux(cfg *config.Config, ghc *ghclient.Client) *http.ServeMux {
	activeCfgMu.Lock()
	activeCfg = cfg
	activeCfgMu.Unlock()
	activeClient.Store(ghc)

	mux := http.NewServeMux()
	mux.HandleFunc("OPTIONS /", corsPreflightHandler)
	mux.HandleFunc("GET /api/health", withCORS(healthHandler))
	mux.HandleFunc("GET /api/version", withCORS(versionHandler))
	mux.HandleFunc("GET /api/settings", withCORS(getSettingsHandler))
	mux.HandleFunc("POST /api/settings", withCORS(postSettingsHandler))
	mux.HandleFunc("GET /api/repos", withCORS(reposHandlerDynamic(cfg)))
	mux.HandleFunc("DELETE /api/repos/{owner}/{repo}", withCORS(deleteRepoHandlerDynamic()))
	mux.HandleFunc("DELETE /api/repos/{name}", withCORS(deleteLocalRepoHandler))
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/commits", withCORS(commitsHandlerDynamic()))
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/pulse", withCORS(pulseHandlerDynamic()))
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/branches", withCORS(branchesHandlerDynamic()))
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/heatmap", withCORS(heatmapHandlerDynamic()))
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/readme", withCORS(readmeHandlerDynamic()))
	mux.HandleFunc("GET /api/activity/heatmap", withCORS(userHeatmapHandler()))
	return mux
}

func corsPreflightHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
	w.WriteHeader(http.StatusNoContent)
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, HealthResponse{OK: true})
}

func versionHandler(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, VersionInfo{Version: Version, RepoURL: RepoURL})
}

// ── Settings ─────────────────────────────────────────────────────────────────

func getSettingsHandler(w http.ResponseWriter, _ *http.Request) {
	activeCfgMu.RLock()
	token := activeCfg.GitHubToken
	activeCfgMu.RUnlock()

	hint := ""
	if len(token) >= 4 {
		hint = "****" + token[len(token)-4:]
	} else if token != "" {
		hint = "****"
	}
	writeJSON(w, SettingsInfo{TokenHint: hint})
}

func postSettingsHandler(w http.ResponseWriter, r *http.Request) {
	var req SettingsInfo
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.GitHubToken == "" {
		errJSON(w, "github_token is required", http.StatusBadRequest)
		return
	}

	// Validate the new token by making a test API call.
	newClient := ghclient.New(req.GitHubToken)
	if _, err := newClient.AuthenticatedUser(r.Context()); err != nil {
		errJSON(w, "invalid token: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Persist to config file.
	activeCfgMu.Lock()
	activeCfg.GitHubToken = req.GitHubToken
	if err := activeCfg.Save(); err != nil {
		activeCfgMu.Unlock()
		errJSON(w, "failed to save config: "+err.Error(), http.StatusInternalServerError)
		return
	}
	activeCfgMu.Unlock()

	// Hot-swap the active client.
	activeClient.Store(newClient)
	log.Printf("credentials updated — now using new GitHub token")

	writeJSON(w, map[string]bool{"ok": true})
}

// ── Repo handlers (dynamic — always read activeClient) ────────────────────────

func reposHandlerDynamic(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ghc := activeClient.Load()
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

func deleteRepoHandlerDynamic() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ghc := activeClient.Load()
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

func commitsHandlerDynamic() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ghc := activeClient.Load()
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

func pulseHandlerDynamic() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ghc := activeClient.Load()
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

func branchesHandlerDynamic() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ghc := activeClient.Load()
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

func heatmapHandlerDynamic() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ghc := activeClient.Load()
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

func readmeHandlerDynamic() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ghc := activeClient.Load()
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
// It fetches commits per-repo filtered by author, in parallel.
func userHeatmapHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ghc := activeClient.Load()
		ctx := r.Context()

		username, err := ghc.AuthenticatedUser(ctx)
		if err != nil {
			errJSON(w, err.Error(), http.StatusBadGateway)
			return
		}

		repos, err := ghc.ListRepos(ctx)
		if err != nil {
			errJSON(w, err.Error(), http.StatusBadGateway)
			return
		}

		type result struct{ commits []*gh.RepositoryCommit }
		results := make(chan result, len(repos))
		sem := make(chan struct{}, 8)

		var wg sync.WaitGroup
		for _, repo := range repos {
			owner := repo.GetOwner().GetLogin()
			name := repo.GetName()
			wg.Add(1)
			go func(owner, name string) {
				defer wg.Done()
				sem <- struct{}{}
				defer func() { <-sem }()
				commits, _ := ghc.CommitHistoryByAuthor(ctx, owner, name, username, 365)
				results <- result{commits: commits}
			}(owner, name)
		}
		go func() {
			wg.Wait()
			close(results)
		}()

		dateCount := make(map[string]int, 365)
		now := time.Now()
		for i := 0; i < 365; i++ {
			d := now.AddDate(0, 0, -i).Format("2006-01-02")
			dateCount[d] = 0
		}

		for rc := range results {
			for _, c := range rc.commits {
				if cm := c.GetCommit(); cm != nil {
					if au := cm.GetAuthor(); au != nil {
						key := au.GetDate().Time.Format("2006-01-02")
						if _, ok := dateCount[key]; ok {
							dateCount[key]++
						}
					}
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

// ── Utilities ─────────────────────────────────────────────────────────────────

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
