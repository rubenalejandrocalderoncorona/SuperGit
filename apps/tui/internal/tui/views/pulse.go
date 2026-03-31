package views

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/rubenalejandrocalderoncorona/supergit/internal/api"
	st "github.com/rubenalejandrocalderoncorona/supergit/internal/tui/styles"
)

// Pulse renders the commit analytics dashboard.
type Pulse struct {
	Data   *api.PulseData
	Repo   string
	Width  int
	Height int
}

// View renders the pulse dashboard.
func (p Pulse) View() string {
	var b strings.Builder

	title := st.StyleTitle.Render("  ◆ Pulse") + "  " + st.StyleMuted.Render(p.Repo)
	b.WriteString(title + "\n\n")

	if p.Data == nil {
		b.WriteString(st.StyleMuted.Render("  Loading pulse data…") + "\n")
		b.WriteString(st.StyleDim.Render("  Select a repo and press p") + "\n")
		return lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(st.ColBorder).
			Width(p.Width - 2).
			Height(p.Height - 2).
			Render(b.String())
	}

	// Stat cards row
	statRow := lipgloss.JoinHorizontal(lipgloss.Top,
		statCard("Most Active Day", p.Data.MostActiveDay, 22),
		"  ",
		statCard("Commits (30d)", fmt.Sprintf("%d", p.Data.TotalCommits30d), 22),
		"  ",
		statCard("Peak Window", truncate(p.Data.HighestVelocityWindow, 20), 26),
	)
	b.WriteString(statRow + "\n\n")

	// Bar chart
	b.WriteString(st.StyleBold.Render("  Commits per day (last 30 days)") + "\n\n")
	maxCount := 0
	for _, d := range p.Data.CommitsByDay {
		if d.Count > maxCount {
			maxCount = d.Count
		}
	}

	barAreaWidth := p.Width - sidebarWidth - 10
	if barAreaWidth < 10 {
		barAreaWidth = 30
	}
	barW := barAreaWidth / len(p.Data.CommitsByDay)
	if barW < 1 {
		barW = 1
	}

	// Render each bar as a vertical stack
	chartHeight := 8
	var cols []string
	for _, d := range p.Data.CommitsByDay {
		filled := 0
		if maxCount > 0 {
			filled = d.Count * chartHeight / maxCount
		}
		var col strings.Builder
		for row := chartHeight; row > 0; row-- {
			if row <= filled {
				col.WriteString(st.StyleAccent.Render("█"))
			} else {
				col.WriteString(st.StyleDim.Render("░"))
			}
			col.WriteString("\n")
		}
		// Date label (just last 2 chars of day)
		col.WriteString(st.StyleDim.Render(d.Date[8:10]))
		cols = append(cols, col.String())
	}

	// Join columns horizontally with 1-space padding
	chartRows := make([][]string, chartHeight+1)
	for row := 0; row <= chartHeight; row++ {
		chartRows[row] = make([]string, len(cols))
	}
	for ci, col := range cols {
		lines := strings.Split(col, "\n")
		for ri, line := range lines {
			if ri <= chartHeight {
				chartRows[ri][ci] = line
			}
		}
	}

	for _, row := range chartRows {
		b.WriteString("  " + strings.Join(row, " ") + "\n")
	}

	return lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(st.ColAccent).
		Width(p.Width - 2).
		Height(p.Height - 2).
		Render(b.String())
}

func statCard(label, value string, width int) string {
	content := st.StyleDim.Render(label) + "\n" + st.StyleAccent.Bold(true).Render(value)
	return lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(st.ColBorder).
		Width(width).
		Padding(0, 1).
		Render(content)
}
