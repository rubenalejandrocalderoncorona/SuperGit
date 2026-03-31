package views

import (
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/rubenalejandrocalderoncorona/supergit/internal/api"
	st "github.com/rubenalejandrocalderoncorona/supergit/internal/tui/styles"
)

// RepoGrid renders the main content pane showing repo cards.
type RepoGrid struct {
	Repos    []api.Repo
	Cursor   int
	Width    int
	Height   int
	Focused  bool
}

// View renders the grid pane.
func (g RepoGrid) View() string {
	border := st.InactiveBorder
	if g.Focused {
		border = st.ActiveBorder
	}

	var b strings.Builder
	b.WriteString(st.StyleTitle.Render("  Repositories") +
		st.StyleDim.Render(fmt.Sprintf("  %d total", len(g.Repos))) + "\n\n")

	if len(g.Repos) == 0 {
		b.WriteString(st.StyleMuted.Render("  No repositories found.") + "\n")
		b.WriteString(st.StyleDim.Render("  Make sure the server is running.") + "\n")
	}

	innerW := g.Width - sidebarWidth - 4
	if innerW < 20 {
		innerW = 20
	}

	for i, r := range g.Repos {
		if i >= g.Height/5 {
			break
		}
		selected := i == g.Cursor && g.Focused
		b.WriteString(renderRepoCard(r, innerW, selected) + "\n")
	}

	return border.
		Width(g.Width - sidebarWidth - 2).
		Height(g.Height - 2).
		Render(b.String())
}

func renderRepoCard(r api.Repo, width int, selected bool) string {
	borderColor := st.ColBorder
	if selected {
		borderColor = st.ColAccent
	}

	// Language badge
	langBadge := ""
	if r.Language != "" {
		col, ok := st.LangColors[r.Language]
		if !ok {
			col = st.ColMuted
		}
		langBadge = lipgloss.NewStyle().Foreground(col).Render("● " + r.Language)
	}

	// Source badge
	sourceBadge := ""
	if r.Source == "local" {
		sourceBadge = " " + st.StyleDim.Render("[local]")
	}

	// Last commit
	lastCommitStr := ""
	if !r.LastCommit.IsZero() {
		lastCommitStr = "  " + st.StyleDim.Render(humanTime(r.LastCommit))
	}

	nameLine := st.StyleBold.Render(truncate(r.Name, width-10)) + sourceBadge
	if langBadge != "" {
		nameLine += "  " + langBadge
	}

	descLine := ""
	if r.Description != "" {
		descLine = "\n" + st.StyleMuted.Render(truncate(r.Description, width-4))
	}

	statsLine := st.StyleDim.Render(fmt.Sprintf("★ %d  ⑂ %d", r.Stars, r.Forks)) + lastCommitStr

	content := nameLine + descLine + "\n" + statsLine

	card := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(borderColor).
		Width(width - 4).
		Padding(0, 1).
		Render(content)

	return card
}

func humanTime(t time.Time) string {
	d := time.Since(t)
	switch {
	case d < time.Hour:
		return fmt.Sprintf("%dm ago", int(d.Minutes()))
	case d < 24*time.Hour:
		return fmt.Sprintf("%dh ago", int(d.Hours()))
	case d < 30*24*time.Hour:
		return fmt.Sprintf("%dd ago", int(d.Hours()/24))
	default:
		return t.Format("Jan 2006")
	}
}
