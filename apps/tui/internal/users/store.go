package users

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

// User is a stored GitHub account.
type User struct {
	Username string `json:"username"`
	Token    string `json:"token"`
}

// Store holds all saved users and which one is active.
type Store struct {
	Active string `json:"active"`
	Users  []User `json:"users"`
	mu     sync.RWMutex `json:"-"`
}

// DefaultPath returns the path to the users JSON file.
func DefaultPath() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".supergit", "users.json")
}

// Load reads the users store from disk. Returns an empty store if the file does not exist.
func Load() (*Store, error) {
	data, err := os.ReadFile(DefaultPath())
	if os.IsNotExist(err) {
		return &Store{Users: []User{}}, nil
	}
	if err != nil {
		return nil, err
	}
	var s Store
	if err := json.Unmarshal(data, &s); err != nil {
		return nil, err
	}
	if s.Users == nil {
		s.Users = []User{}
	}
	return &s, nil
}

// Save writes the store to disk atomically (marshal under lock, write outside).
func (s *Store) Save() error {
	s.mu.RLock()
	data, err := json.MarshalIndent(s, "", "  ")
	s.mu.RUnlock()
	if err != nil {
		return err
	}
	path := DefaultPath()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}

// Find returns a pointer to the user with the given username, or nil.
func (s *Store) Find(username string) *User {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.Users {
		if s.Users[i].Username == username {
			return &s.Users[i]
		}
	}
	return nil
}

// SetActive marks the given username as active. Returns an error if the username is not in the store.
func (s *Store) SetActive(username string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, u := range s.Users {
		if u.Username == username {
			s.Active = username
			return nil
		}
	}
	return fmt.Errorf("user %q not found", username)
}

// Add inserts or updates a user by username.
func (s *Store) Add(u User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.Users {
		if s.Users[i].Username == u.Username {
			s.Users[i].Token = u.Token
			return nil
		}
	}
	s.Users = append(s.Users, u)
	return nil
}

// Remove deletes the user with the given username. Clears Active if that user was active.
func (s *Store) Remove(username string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	filtered := s.Users[:0]
	found := false
	for _, u := range s.Users {
		if u.Username == username {
			found = true
		} else {
			filtered = append(filtered, u)
		}
	}
	if !found {
		return fmt.Errorf("user %q not found", username)
	}
	s.Users = filtered
	if s.Active == username {
		s.Active = ""
	}
	return nil
}
