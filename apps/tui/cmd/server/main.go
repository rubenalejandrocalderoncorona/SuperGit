package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/rubenalejandrocalderoncorona/supergit/internal/api"
	"github.com/rubenalejandrocalderoncorona/supergit/internal/config"
	ghauth "github.com/rubenalejandrocalderoncorona/supergit/internal/github"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Printf("config warning: %v (using defaults)", err)
	}

	token, err := ghauth.Token()
	if err != nil {
		log.Fatalf("GitHub auth error: %v", err)
	}

	// Store the resolved token in config so the settings handler can persist it.
	if cfg.GitHubToken == "" {
		cfg.GitHubToken = token
	}

	ghClient := ghauth.New(token)

	mux := api.BuildMux(cfg, ghClient)

	port := os.Getenv("SUPERGIT_PORT")
	if port == "" {
		port = fmt.Sprintf("%d", cfg.ServerPort)
	}

	log.Printf("supergit server running at http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
