package views

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/rubenalejandrocalderoncorona/supergit/internal/api"
	st "github.com/rubenalejandrocalderoncorona/supergit/internal/tui/styles"
)

const sidebarWidth = 30

// Sidebar renders the left navigation pane.
type Sidebar struct {
	Repos    []api.Repo
	Cursor   int
	Height   int
	Focused  bool
}

// View renders the sidebar as a string.
func (s Sidebar) View() string {
	border := st.InactiveBorder
	if s.Focused {
		border = st.ActiveBorder
	}
	inner := border.
		Width(sidebarWidth - 2).
		Height(s.Height - 2)

	var b strings.Builder

	// Title
	b.WriteString(st.StyleTitle.Render("  SuperGit") + "\n\n")

	// Nav items
	b.WriteString(navItem("Repositories", true) + "\n\n")
	b.WriteString(sectionHeader("RECENT") + "\n")

	// Repo list
	visible := s.Height - 9
	if visible < 1 {
		visible = 1
	}
	start := 0
	if s.Cursor >= visible {
		start = s.Cursor - visible + 1
	}
	for i := start; i < len(s.Repos) && i < start+visible; i++ {
		r := s.Repos[i]
		selected := i == s.Cursor
		b.WriteString(sidebarItem(r.Name, selected) + "\n")
	}

	return inner.Render(b.String())
}

// Width returns the total sidebar width including border.
func (s Sidebar) Width() int { return sidebarWidth }

func navItem(label string, active bool) string {
	style := st.StyleMuted
	if active {
		style = st.StyleAccent
	}
	return "  " + style.Render(label)
}

func sectionHeader(label string) string {
	return st.StyleDim.Render("  " + label)
}

func sidebarItem(name string, selected bool) string {
	prefix := "  "
	if selected {
		prefix = st.StyleAccent.Render(" ▶ ")
		return prefix + st.StyleAccent.Render(truncate(name, sidebarWidth-5))
	}
	return prefix + " " + st.StyleMuted.Render(truncate(name, sidebarWidth-5))
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max-1] + "…"
}

// SidebarWidth is the total rendered width including border.
const SidebarWidth = sidebarWidth

// ensure fmt is used
var _ = fmt.Sprint
var _ = lipgloss.NewStyle
