package config

import (
	"encoding/json"
	"os"
	"path/filepath"
)

const defaultPort = 8765

// Config holds SuperGit runtime configuration.
type Config struct {
	ScanDirs    []string `json:"scan_dirs"`
	ServerPort  int      `json:"server_port"`
	GitHubToken string   `json:"github_token,omitempty"`
}

// Load reads ~/.supergit/config.json, creating defaults if absent.
func Load() (*Config, error) {
	path := DefaultPath()
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		cfg := defaults()
		if werr := write(path, cfg); werr != nil {
			return cfg, nil // still usable even if write fails
		}
		return cfg, nil
	}
	if err != nil {
		return defaults(), nil
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return defaults(), nil
	}
	if cfg.ServerPort == 0 {
		cfg.ServerPort = defaultPort
	}
	return &cfg, nil
}

// DefaultPath returns the path to the config file.
func DefaultPath() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".supergit", "config.json")
}

func defaults() *Config {
	home, _ := os.UserHomeDir()
	return &Config{
		ScanDirs: []string{
			filepath.Join(home, "Documents", "PersonalRepos"),
		},
		ServerPort: defaultPort,
	}
}

func write(path string, cfg *Config) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}
