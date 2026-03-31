package client

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/rubenalejandrocalderoncorona/supergit/internal/api"
)

// ErrServerUnavailable is returned when the supergit server is not reachable.
var ErrServerUnavailable = errors.New("supergit server not running — start with: go run ./cmd/server")

// Client is a typed HTTP client for the SuperGit REST API.
type Client struct {
	baseURL    string
	httpClient *http.Client
}

// New creates a new API client targeting baseURL (e.g. "http://localhost:8765").
func New(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

// GetRepos fetches the full repo list from the server.
func (c *Client) GetRepos() ([]api.Repo, error) {
	var repos []api.Repo
	if err := c.get("/api/repos", &repos); err != nil {
		return nil, err
	}
	return repos, nil
}

// GetPulse fetches pulse analytics for the given owner/repo.
func (c *Client) GetPulse(owner, repo string) (*api.PulseData, error) {
	var pulse api.PulseData
	path := fmt.Sprintf("/api/repos/%s/%s/pulse", owner, repo)
	if err := c.get(path, &pulse); err != nil {
		return nil, err
	}
	return &pulse, nil
}

// GetVersion fetches the version info from the server.
func (c *Client) GetVersion() (*api.VersionInfo, error) {
	var vi api.VersionInfo
	if err := c.get("/api/version", &vi); err != nil {
		return nil, err
	}
	return &vi, nil
}

func (c *Client) get(path string, out any) error {
	resp, err := c.httpClient.Get(c.baseURL + path)
	if err != nil {
		return ErrServerUnavailable
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server returned %d for %s", resp.StatusCode, path)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}
