package github

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// Token resolves the GitHub personal access token.
// Priority: GITHUB_TOKEN env var → `gh auth token` subprocess.
func Token() (string, error) {
	if t := os.Getenv("GITHUB_TOKEN"); t != "" {
		return t, nil
	}
	out, err := exec.Command("gh", "auth", "token").Output()
	if err != nil {
		return "", fmt.Errorf("gh auth token failed: %w (is gh CLI installed and authenticated?)", err)
	}
	token := strings.TrimSpace(string(out))
	if token == "" {
		return "", fmt.Errorf("gh auth token returned empty string — run: gh auth login")
	}
	return token, nil
}
