package tui

import (
	"errors"
	"fmt"
	"os/exec"
	"runtime"
	"strings"

	"github.com/charmbracelet/bubbles/key"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/rubenalejandrocalderoncorona/supergit/internal/api"
	"github.com/rubenalejandrocalderoncorona/supergit/internal/tui/client"
	st "github.com/rubenalejandrocalderoncorona/supergit/internal/tui/styles"
	"github.com/rubenalejandrocalderoncorona/supergit/internal/tui/views"
)

type pane int

const (
	paneSidebar pane = iota
	paneGrid
	panePulse
)

// App is the root Bubble Tea model.
type App struct {
	apiClient   *client.Client
	repos       []api.Repo
	filtered    []api.Repo
	cursor      int
	activePane  pane
	searchInput textinput.Model
	searching   bool
	helpVisible bool
	status      string
	width       int
	height      int
	loading     bool
	pulseData   *api.PulseData
	pulseRepo   string
}

// Messages
type reposLoadedMsg struct{ repos []api.Repo }
type pulseLoadedMsg struct{ data *api.PulseData }
type errMsg struct{ err error }

// New creates the initial App model.
func New(c *client.Client) App {
	ti := textinput.New()
	ti.Placeholder = "search repos…"
	ti.CharLimit = 60

	return App{
		apiClient:  c,
		activePane: paneSidebar,
		searchInput: ti,
		loading:    true,
		status:     "Loading repositories…",
	}
}

// Init fires the initial repo load.
func (a App) Init() tea.Cmd {
	return loadReposCmd(a.apiClient)
}

func loadReposCmd(c *client.Client) tea.Cmd {
	return func() tea.Msg {
		repos, err := c.GetRepos()
		if err != nil {
			return errMsg{err}
		}
		return reposLoadedMsg{repos}
	}
}

func loadPulseCmd(c *client.Client, owner, repo string) tea.Cmd {
	return func() tea.Msg {
		data, err := c.GetPulse(owner, repo)
		if err != nil {
			return errMsg{err}
		}
		return pulseLoadedMsg{data}
	}
}

// Update handles all messages.
func (a App) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {

	case tea.WindowSizeMsg:
		a.width = msg.Width
		a.height = msg.Height
		return a, nil

	case reposLoadedMsg:
		a.repos = msg.repos
		a.filtered = msg.repos
		a.loading = false
		a.status = fmt.Sprintf("%d repositories", len(msg.repos))
		return a, nil

	case pulseLoadedMsg:
		a.pulseData = msg.data
		a.status = fmt.Sprintf("Pulse loaded for %s", a.pulseRepo)
		return a, nil

	case errMsg:
		a.loading = false
		if errors.Is(msg.err, client.ErrServerUnavailable) {
			a.status = "⚠  Server not running. Press r to retry, or start: go run ./cmd/server"
		} else {
			a.status = "Error: " + msg.err.Error()
		}
		return a, nil

	case tea.KeyMsg:
		// If searching, forward to text input
		if a.searching {
			switch msg.String() {
			case "esc", "enter":
				a.searching = false
				a.searchInput.Blur()
				a.filterRepos()
				return a, nil
			}
			var cmd tea.Cmd
			a.searchInput, cmd = a.searchInput.Update(msg)
			a.filterRepos()
			return a, cmd
		}

		switch {
		case matchKey(msg, Keys.Quit):
			return a, tea.Quit

		case matchKey(msg, Keys.Help):
			a.helpVisible = !a.helpVisible

		case matchKey(msg, Keys.Refresh):
			a.loading = true
			a.status = "Refreshing…"
			return a, loadReposCmd(a.apiClient)

		case matchKey(msg, Keys.Search):
			a.searching = true
			a.searchInput.Focus()
			return a, textinput.Blink

		case matchKey(msg, Keys.Back):
			if a.activePane == panePulse {
				a.activePane = paneGrid
			} else if a.activePane == paneGrid {
				a.activePane = paneSidebar
			}

		case matchKey(msg, Keys.Left):
			if a.activePane == paneGrid {
				a.activePane = paneSidebar
			}

		case matchKey(msg, Keys.Right):
			if a.activePane == paneSidebar {
				a.activePane = paneGrid
			}

		case matchKey(msg, Keys.Up):
			if a.cursor > 0 {
				a.cursor--
			}

		case matchKey(msg, Keys.Down):
			max := len(a.filtered) - 1
			if a.activePane == paneSidebar {
				max = len(a.repos) - 1
			}
			if a.cursor < max {
				a.cursor++
			}

		case matchKey(msg, Keys.Open):
			url := a.selectedURL()
			if url != "" {
				openBrowser(url)
				a.status = "Opened in browser: " + url
			}

		case matchKey(msg, Keys.Pulse):
			if len(a.filtered) > 0 && a.cursor < len(a.filtered) {
				r := a.filtered[a.cursor]
				parts := strings.Split(r.FullName, "/")
				if len(parts) == 2 {
					a.activePane = panePulse
					a.pulseRepo = r.FullName
					a.pulseData = nil
					a.status = "Loading pulse for " + r.FullName + "…"
					return a, loadPulseCmd(a.apiClient, parts[0], parts[1])
				}
			}
		}
	}

	return a, nil
}

// View renders the full TUI layout.
func (a App) View() string {
	if a.width == 0 {
		return "Initializing…"
	}

	sidebar := views.Sidebar{
		Repos:   a.repos,
		Cursor:  a.cursor,
		Height:  a.height - 2,
		Focused: a.activePane == paneSidebar,
	}

	var mainPane string
	switch a.activePane {
	case panePulse:
		pulse := views.Pulse{
			Data:   a.pulseData,
			Repo:   a.pulseRepo,
			Width:  a.width - views.SidebarWidth,
			Height: a.height - 2,
		}
		mainPane = pulse.View()
	default:
		grid := views.RepoGrid{
			Repos:   a.filtered,
			Cursor:  a.cursor,
			Width:   a.width,
			Height:  a.height - 2,
			Focused: a.activePane == paneGrid,
		}
		mainPane = grid.View()
	}

	body := lipgloss.JoinHorizontal(lipgloss.Top, sidebar.View(), mainPane)

	// Status bar
	searchStr := ""
	if a.searching {
		searchStr = " / " + a.searchInput.View()
	}
	statusContent := st.StyleMuted.Render(a.status) + searchStr
	statusBar := st.StatusBar.Width(a.width).Render(statusContent)

	help := ""
	if a.helpVisible {
		help = "\n" + renderHelp()
	}

	return body + "\n" + statusBar + help
}

func (a *App) filterRepos() {
	q := strings.ToLower(a.searchInput.Value())
	if q == "" {
		a.filtered = a.repos
		a.cursor = 0
		return
	}
	var out []api.Repo
	for _, r := range a.repos {
		if strings.Contains(strings.ToLower(r.Name), q) ||
			strings.Contains(strings.ToLower(r.Description), q) {
			out = append(out, r)
		}
	}
	a.filtered = out
	a.cursor = 0
}

func (a App) selectedURL() string {
	if a.activePane == paneSidebar && a.cursor < len(a.repos) {
		return a.repos[a.cursor].URL
	}
	if a.cursor < len(a.filtered) {
		return a.filtered[a.cursor].URL
	}
	return ""
}

func matchKey(msg tea.KeyMsg, b key.Binding) bool {
	return key.Matches(msg, b)
}

func openBrowser(url string) {
	var cmd string
	var args []string
	switch runtime.GOOS {
	case "darwin":
		cmd, args = "open", []string{url}
	case "linux":
		cmd, args = "xdg-open", []string{url}
	default:
		cmd, args = "cmd", []string{"/c", "start", url}
	}
	_ = exec.Command(cmd, args...).Start()
}

func renderHelp() string {
	bindings := []string{
		"k/↑  up       j/↓  down",
		"h/←  sidebar  l/→  main",
		"o    open URL  p  pulse",
		"/  search     r  refresh",
		"?  help       q  quit",
	}
	var b strings.Builder
	for _, line := range bindings {
		b.WriteString(st.StyleDim.Render("  " + line) + "\n")
	}
	return lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(st.ColBorder).
		Render(b.String())
}
