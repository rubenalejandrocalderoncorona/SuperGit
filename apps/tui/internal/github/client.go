package github

import (
	"context"
	"time"

	gh "github.com/google/go-github/v68/github"
	"golang.org/x/oauth2"
)

// Client wraps the go-github client.
type Client struct {
	gh *gh.Client
}

// New creates an authenticated GitHub client using the provided token.
func New(token string) *Client {
	ts := oauth2.StaticTokenSource(&oauth2.Token{AccessToken: token})
	tc := oauth2.NewClient(context.Background(), ts)
	return &Client{gh: gh.NewClient(tc)}
}

// ListRepos returns all repos for the authenticated user (up to 300).
func (c *Client) ListRepos(ctx context.Context) ([]*gh.Repository, error) {
	opts := &gh.RepositoryListByAuthenticatedUserOptions{
		Sort:      "updated",
		Direction: "desc",
		ListOptions: gh.ListOptions{PerPage: 100},
	}
	var all []*gh.Repository
	for page := 1; page <= 3; page++ {
		opts.Page = page
		repos, resp, err := c.gh.Repositories.ListByAuthenticatedUser(ctx, opts)
		if err != nil {
			return all, err
		}
		all = append(all, repos...)
		if resp.NextPage == 0 {
			break
		}
	}
	return all, nil
}

// DeleteRepo permanently deletes the given repository via the GitHub API.
// The authenticated token must have the `delete_repo` scope.
func (c *Client) DeleteRepo(ctx context.Context, owner, repo string) error {
	_, err := c.gh.Repositories.Delete(ctx, owner, repo)
	return err
}

// CommitHistory returns commits for owner/repo over the last `days` days.
func (c *Client) CommitHistory(ctx context.Context, owner, repo string, days int) ([]*gh.RepositoryCommit, error) {
	since := time.Now().AddDate(0, 0, -days)
	opts := &gh.CommitsListOptions{
		Since: since,
		ListOptions: gh.ListOptions{PerPage: 100},
	}
	var all []*gh.RepositoryCommit
	for page := 1; page <= 5; page++ {
		opts.Page = page
		commits, resp, err := c.gh.Repositories.ListCommits(ctx, owner, repo, opts)
		if err != nil {
			return all, err
		}
		all = append(all, commits...)
		if resp.NextPage == 0 {
			break
		}
	}
	return all, nil
}
