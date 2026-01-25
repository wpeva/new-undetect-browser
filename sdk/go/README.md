# UndetectBrowser Go SDK

Official Go SDK for UndetectBrowser Anti-Detection Platform.

## Installation

```bash
go get github.com/wpeva/new-undetect-browser/sdk/go
```

## Quick Start

```go
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/wpeva/new-undetect-browser/sdk/go/antidetect"
)

func main() {
	// Create client
	client := antidetect.NewClient(
		"http://localhost:3000",
		antidetect.WithAPIKey("your-api-key"),
	)

	ctx := context.Background()

	// Create a profile
	profile, err := client.Profiles.Create(ctx, antidetect.CreateProfileOptions{
		Name:    "My Profile",
		OS:      "windows",
		Browser: "chrome",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Created profile: %s\n", profile.ID)

	// Launch browser session
	session, err := client.Sessions.Launch(ctx, profile.ID, &antidetect.LaunchOptions{
		Headless: false,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Session started: %s\n", session.ID)
	fmt.Printf("WebSocket endpoint: %s\n", session.WSEndpoint)

	// Get detection score
	score, err := client.Sessions.GetDetectionScore(ctx, session.ID)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Detection score: %.1f\n", score.Score)

	// Navigate to a page
	err = client.Sessions.Navigate(ctx, session.ID, "https://example.com")
	if err != nil {
		log.Fatal(err)
	}

	// Stop session
	err = client.Sessions.Stop(ctx, session.ID)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Session stopped")
}
```

## API Reference

### Client

```go
// Create client with default settings
client := antidetect.NewClient("http://localhost:3000")

// With API key
client := antidetect.NewClient(
	"http://localhost:3000",
	antidetect.WithAPIKey("your-api-key"),
)

// With custom timeout
client := antidetect.NewClient(
	"http://localhost:3000",
	antidetect.WithTimeout(60 * time.Second),
)

// With custom HTTP client
client := antidetect.NewClient(
	"http://localhost:3000",
	antidetect.WithHTTPClient(&http.Client{
		Timeout: 30 * time.Second,
	}),
)
```

### Profiles

```go
ctx := context.Background()

// List all profiles
profiles, err := client.Profiles.List(ctx, &antidetect.ListOptions{
	Page:  1,
	Limit: 10,
})

// Get a profile
profile, err := client.Profiles.Get(ctx, "profile-id")

// Create a profile
profile, err := client.Profiles.Create(ctx, antidetect.CreateProfileOptions{
	Name:    "My Profile",
	OS:      "windows",
	Browser: "chrome",
	Proxy: &antidetect.ProxyConfig{
		Enabled: true,
		Type:    "http",
		Host:    "192.168.1.1",
		Port:    8080,
	},
})

// Update a profile
profile, err := client.Profiles.Update(ctx, "profile-id", map[string]interface{}{
	"name": "New Name",
})

// Delete a profile
err := client.Profiles.Delete(ctx, "profile-id")
```

### Sessions

```go
// Launch a browser session
session, err := client.Sessions.Launch(ctx, "profile-id", &antidetect.LaunchOptions{
	Headless: false,
	Args:     []string{"--no-sandbox"},
})

// Get session info
session, err := client.Sessions.Get(ctx, "session-id")

// Get detection score
score, err := client.Sessions.GetDetectionScore(ctx, "session-id")
fmt.Printf("Score: %.1f\n", score.Score)

// Navigate to URL
err := client.Sessions.Navigate(ctx, "session-id", "https://example.com")

// Execute JavaScript
result, err := client.Sessions.Execute(ctx, "session-id", "return document.title")

// Stop session
err := client.Sessions.Stop(ctx, "session-id")
```

### Proxies

```go
// List proxies
proxies, err := client.Proxies.List(ctx)

// Get a proxy
proxy, err := client.Proxies.Get(ctx, "proxy-id")

// Create a proxy
proxy, err := client.Proxies.Create(ctx, antidetect.Proxy{
	Name:     "My Proxy",
	Type:     "http",
	Host:     "192.168.1.1",
	Port:     8080,
	Username: "user",
	Password: "pass",
})

// Test proxy
result, err := client.Proxies.Test(ctx, "proxy-id")
fmt.Printf("Status: %s, Latency: %v\n", result["status"], result["latency"])

// Delete proxy
err := client.Proxies.Delete(ctx, "proxy-id")
```

### Analytics

```go
// Get dashboard stats
stats, err := client.Analytics.GetDashboard(ctx)
fmt.Printf("Active sessions: %d\n", stats.ActiveSessions)
fmt.Printf("Average detection score: %.1f\n", stats.AverageDetectionScore)
```

### Health Check

```go
health, err := client.Health(ctx)
fmt.Printf("Status: %s, Version: %s\n", health.Status, health.Version)
```

## Error Handling

```go
import (
	"errors"
	"github.com/wpeva/new-undetect-browser/sdk/go/antidetect"
)

profile, err := client.Profiles.Get(ctx, "non-existent-id")
if err != nil {
	var notFoundErr *antidetect.NotFoundError
	var authErr *antidetect.AuthenticationError
	var validationErr *antidetect.ValidationError
	var rateLimitErr *antidetect.RateLimitError

	switch {
	case errors.As(err, &notFoundErr):
		fmt.Println("Profile not found")
	case errors.As(err, &authErr):
		fmt.Println("Authentication failed")
	case errors.As(err, &validationErr):
		fmt.Println("Validation error:", validationErr.Message)
	case errors.As(err, &rateLimitErr):
		fmt.Println("Rate limit exceeded, retry after:", rateLimitErr.RetryAfter)
	default:
		fmt.Println("Unknown error:", err)
	}
}
```

## Requirements

- Go 1.21+

## License

MIT
