package main

import (
	"fmt"
	"log"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/rubenalejandrocalderoncorona/supergit/internal/config"
	"github.com/rubenalejandrocalderoncorona/supergit/internal/tui"
	"github.com/rubenalejandrocalderoncorona/supergit/internal/tui/client"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Printf("config warning: %v (using defaults)", err)
	}

	serverURL := fmt.Sprintf("http://localhost:%d", cfg.ServerPort)
	c := client.New(serverURL)

	p := tea.NewProgram(
		tui.New(c),
		tea.WithAltScreen(),
		tea.WithMouseCellMotion(),
	)

	if _, err := p.Run(); err != nil {
		log.Fatal(err)
	}
}
