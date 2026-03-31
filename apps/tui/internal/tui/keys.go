package tui

import "github.com/charmbracelet/bubbles/key"

// keyMap defines all key bindings for the TUI.
type keyMap struct {
	Up      key.Binding
	Down    key.Binding
	Left    key.Binding
	Right   key.Binding
	Open    key.Binding
	Pulse   key.Binding
	Search  key.Binding
	Refresh key.Binding
	Help    key.Binding
	Back    key.Binding
	Quit    key.Binding
}

var Keys = keyMap{
	Up:      key.NewBinding(key.WithKeys("k", "up"), key.WithHelp("k/↑", "move up")),
	Down:    key.NewBinding(key.WithKeys("j", "down"), key.WithHelp("j/↓", "move down")),
	Left:    key.NewBinding(key.WithKeys("h", "left"), key.WithHelp("h/←", "focus sidebar")),
	Right:   key.NewBinding(key.WithKeys("l", "right"), key.WithHelp("l/→", "focus main")),
	Open:    key.NewBinding(key.WithKeys("o"), key.WithHelp("o", "open in browser")),
	Pulse:   key.NewBinding(key.WithKeys("p"), key.WithHelp("p", "pulse dashboard")),
	Search:  key.NewBinding(key.WithKeys("/"), key.WithHelp("/", "search")),
	Refresh: key.NewBinding(key.WithKeys("r"), key.WithHelp("r", "refresh")),
	Help:    key.NewBinding(key.WithKeys("?"), key.WithHelp("?", "toggle help")),
	Back:    key.NewBinding(key.WithKeys("esc"), key.WithHelp("esc", "back")),
	Quit:    key.NewBinding(key.WithKeys("q", "ctrl+c"), key.WithHelp("q", "quit")),
}
