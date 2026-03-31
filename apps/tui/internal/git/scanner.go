package git

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

// Repo represents a discovered local git repository.
type Repo struct {
	Name      string
	Path      string
	RemoteURL string
}

// Scan walks each directory in dirs (depth 2) looking for subdirectories
// containing a .git folder.
func Scan(dirs []string) ([]Repo, error) {
	var repos []Repo
	for _, dir := range dirs {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, e := range entries {
			if !e.IsDir() {
				continue
			}
			candidate := filepath.Join(dir, e.Name())
			dotGit := filepath.Join(candidate, ".git")
			if info, err := os.Stat(dotGit); err == nil && info.IsDir() {
				repos = append(repos, Repo{
					Name:      e.Name(),
					Path:      candidate,
					RemoteURL: parseRemoteURL(dotGit),
				})
			}
		}
	}
	return repos, nil
}

// parseRemoteURL reads the [remote "origin"] url from .git/config.
func parseRemoteURL(dotGitPath string) string {
	f, err := os.Open(filepath.Join(dotGitPath, "config"))
	if err != nil {
		return ""
	}
	defer f.Close()

	inOrigin := false
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == `[remote "origin"]` {
			inOrigin = true
			continue
		}
		if inOrigin {
			if strings.HasPrefix(line, "[") {
				break
			}
			if strings.HasPrefix(line, "url =") {
				return strings.TrimSpace(strings.TrimPrefix(line, "url ="))
			}
		}
	}
	return ""
}
