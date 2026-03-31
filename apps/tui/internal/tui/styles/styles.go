package styles

import "github.com/charmbracelet/lipgloss"

// Color palette — macOS dark, matching the GUI.
var (
	ColBg     = lipgloss.Color("#0f1923")
	ColCard   = lipgloss.Color("#162030")
	ColBorder = lipgloss.Color("#1e3a5f")
	ColAccent = lipgloss.Color("#378ADD")
	ColMuted  = lipgloss.Color("#5a8ab0")
	ColDim    = lipgloss.Color("#2a4a6a")
	ColText   = lipgloss.Color("#d8e8f5")
	ColGreen  = lipgloss.Color("#6dcc8a")
	ColYellow = lipgloss.Color("#d4a84b")
)

// Language badge colors
var LangColors = map[string]lipgloss.Color{
	"Go":         lipgloss.Color("#00ADD8"),
	"TypeScript": lipgloss.Color("#3178C6"),
	"JavaScript": lipgloss.Color("#F7DF1E"),
	"Python":     lipgloss.Color("#3572A5"),
	"Rust":       lipgloss.Color("#DEA584"),
	"Ruby":       lipgloss.Color("#CC342D"),
	"Swift":      lipgloss.Color("#F05138"),
}

// Base styles
var (
	StyleBase   = lipgloss.NewStyle().Foreground(ColText)
	StyleBold   = lipgloss.NewStyle().Foreground(ColText).Bold(true)
	StyleAccent = lipgloss.NewStyle().Foreground(ColAccent)
	StyleMuted  = lipgloss.NewStyle().Foreground(ColMuted)
	StyleDim    = lipgloss.NewStyle().Foreground(ColDim)
	StyleGreen  = lipgloss.NewStyle().Foreground(ColGreen)

	// Panel borders
	ActiveBorder = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(ColAccent)

	InactiveBorder = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(ColBorder)

	// Status bar
	StatusBar = lipgloss.NewStyle().
			Background(ColCard).
			Foreground(ColMuted).
			Padding(0, 1)

	// Card style
	CardStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(ColBorder).
			Padding(0, 1)

	// Title
	StyleTitle = lipgloss.NewStyle().
			Foreground(ColAccent).
			Bold(true)
)

// CommitBar renders a single-line bar chart segment.
// filled chars out of width using block characters.
func CommitBar(count, maxCount, width int) string {
	if maxCount == 0 || width == 0 {
		return StyleDim.Render(repeat("░", width))
	}
	filled := count * width / maxCount
	if filled > width {
		filled = width
	}
	bar := StyleAccent.Render(repeat("█", filled)) + StyleDim.Render(repeat("░", width-filled))
	return bar
}

func repeat(s string, n int) string {
	result := ""
	for i := 0; i < n; i++ {
		result += s
	}
	return result
}
