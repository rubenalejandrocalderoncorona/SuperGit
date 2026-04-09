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
func (c *Client) DeleteRepo(ctx context.Context, owner, repo string) error {
	_, err := c.gh.Repositories.Delete(ctx, owner, repo)
	return err
}

// BranchCount returns the number of branches for owner/repo.
func (c *Client) BranchCount(ctx context.Context, owner, repo string) (int, error) {
	opts := &gh.BranchListOptions{ListOptions: gh.ListOptions{PerPage: 100}}
	var count int
	for page := 1; page <= 5; page++ {
		opts.Page = page
		branches, resp, err := c.gh.Repositories.ListBranches(ctx, owner, repo, opts)
		if err != nil {
			return 0, err
		}
		count += len(branches)
		if resp.NextPage == 0 {
			break
		}
	}
	return count, nil
}

// GetReadme returns the raw markdown content of owner/repo's README.
func (c *Client) GetReadme(ctx context.Context, owner, repo string) (string, error) {
	file, _, err := c.gh.Repositories.GetReadme(ctx, owner, repo, nil)
	if err != nil {
		return "", err
	}
	content, err := file.GetContent()
	if err != nil {
		return "", err
	}
	return content, nil
}

// AuthenticatedUser returns the login name of the authenticated user.
func (c *Client) AuthenticatedUser(ctx context.Context) (string, error) {
	u, _, err := c.gh.Users.Get(ctx, "")
	if err != nil {
		return "", err
	}
	return u.GetLogin(), nil
}

// UserActivity returns recent push events performed by username (up to 300, GitHub API cap).
func (c *Client) UserActivity(ctx context.Context, username string) ([]*gh.Event, error) {
	opts := &gh.ListOptions{PerPage: 100}
	var all []*gh.Event
	for page := 1; page <= 3; page++ {
		opts.Page = page
		events, resp, err := c.gh.Activity.ListEventsPerformedByUser(ctx, username, false, opts)
		if err != nil {
			return all, err
		}
		all = append(all, events...)
		if resp.NextPage == 0 {
			break
		}
	}
	return all, nil
}

// CommitHistoryByAuthor returns commits for owner/repo over the last `days` days,
// filtered to commits authored by the given GitHub username.
func (c *Client) CommitHistoryByAuthor(ctx context.Context, owner, repo, author string, days int) ([]*gh.RepositoryCommit, error) {
	since := time.Now().AddDate(0, 0, -days)
	opts := &gh.CommitsListOptions{
		Author: author,
		Since:  since,
		ListOptions: gh.ListOptions{PerPage: 100},
	}
	var all []*gh.RepositoryCommit
	for page := 1; page <= 10; page++ {
		opts.Page = page
		commits, resp, err := c.gh.Repositories.ListCommits(ctx, owner, repo, opts)
		if err != nil {
			// Swallow 409 (empty repo) and 404 errors silently.
			return all, nil
		}
		all = append(all, commits...)
		if resp.NextPage == 0 {
			break
		}
	}
	return all, nil
}

// CommitHistory returns commits for owner/repo over the last `days` days.
func (c *Client) CommitHistory(ctx context.Context, owner, repo string, days int) ([]*gh.RepositoryCommit, error) {
	since := time.Now().AddDate(0, 0, -days)
	opts := &gh.CommitsListOptions{
		Since:       since,
		ListOptions: gh.ListOptions{PerPage: 100},
	}
	// Allow up to 20 pages (2 000 commits) to cover a full year.
	maxPages := 20
	var all []*gh.RepositoryCommit
	for page := 1; page <= maxPages; page++ {
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
