// Package antidetect provides a Go SDK for UndetectBrowser Anti-Detection Platform.
//
// Example usage:
//
//	client := antidetect.NewClient("http://localhost:3000", antidetect.WithAPIKey("your-api-key"))
//	profile, err := client.Profiles.Create(context.Background(), antidetect.CreateProfileOptions{
//		Name:    "My Profile",
//		OS:      "windows",
//		Browser: "chrome",
//	})
//	if err != nil {
//		log.Fatal(err)
//	}
//	session, err := client.Sessions.Launch(context.Background(), profile.ID, nil)
//	if err != nil {
//		log.Fatal(err)
//	}
//	defer client.Sessions.Stop(context.Background(), session.ID)
package antidetect

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Client is the main client for interacting with the UndetectBrowser API.
type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client

	// API Resources
	Profiles  *ProfilesService
	Sessions  *SessionsService
	Proxies   *ProxiesService
	Analytics *AnalyticsService
}

// ClientOption is a function that configures the client.
type ClientOption func(*Client)

// WithAPIKey sets the API key for authentication.
func WithAPIKey(apiKey string) ClientOption {
	return func(c *Client) {
		c.apiKey = apiKey
	}
}

// WithHTTPClient sets a custom HTTP client.
func WithHTTPClient(httpClient *http.Client) ClientOption {
	return func(c *Client) {
		c.httpClient = httpClient
	}
}

// WithTimeout sets the request timeout.
func WithTimeout(timeout time.Duration) ClientOption {
	return func(c *Client) {
		c.httpClient.Timeout = timeout
	}
}

// NewClient creates a new UndetectBrowser API client.
func NewClient(baseURL string, opts ...ClientOption) *Client {
	// Normalize base URL
	baseURL = strings.TrimSuffix(baseURL, "/")
	if !strings.Contains(baseURL, "/api") {
		baseURL += "/api/v2"
	}

	c := &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}

	for _, opt := range opts {
		opt(c)
	}

	// Initialize services
	c.Profiles = &ProfilesService{client: c}
	c.Sessions = &SessionsService{client: c}
	c.Proxies = &ProxiesService{client: c}
	c.Analytics = &AnalyticsService{client: c}

	return c
}

// APIResponse represents a generic API response.
type APIResponse struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data,omitempty"`
	Error   string          `json:"error,omitempty"`
	Message string          `json:"message,omitempty"`
}

// request makes an HTTP request to the API.
func (c *Client) request(ctx context.Context, method, path string, body interface{}, result interface{}) error {
	var bodyReader io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("failed to marshal request body: %w", err)
		}
		bodyReader = bytes.NewReader(jsonBody)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bodyReader)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	if c.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	// Handle HTTP errors
	if resp.StatusCode >= 400 {
		return c.handleErrorResponse(resp.StatusCode, respBody)
	}

	// Parse response
	var apiResp APIResponse
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		// If not a standard API response, try parsing directly
		if result != nil {
			return json.Unmarshal(respBody, result)
		}
		return nil
	}

	if !apiResp.Success && apiResp.Error != "" {
		return &Error{
			Message:    apiResp.Error,
			StatusCode: resp.StatusCode,
		}
	}

	if result != nil && len(apiResp.Data) > 0 {
		return json.Unmarshal(apiResp.Data, result)
	}

	return nil
}

func (c *Client) handleErrorResponse(statusCode int, body []byte) error {
	var apiResp APIResponse
	if err := json.Unmarshal(body, &apiResp); err == nil && apiResp.Error != "" {
		switch statusCode {
		case 401:
			return &AuthenticationError{Message: apiResp.Error}
		case 404:
			return &NotFoundError{Message: apiResp.Error}
		case 400:
			return &ValidationError{Message: apiResp.Error}
		case 429:
			return &RateLimitError{Message: apiResp.Error}
		default:
			return &Error{Message: apiResp.Error, StatusCode: statusCode}
		}
	}

	switch statusCode {
	case 401:
		return &AuthenticationError{Message: "authentication failed"}
	case 404:
		return &NotFoundError{Message: "resource not found"}
	case 400:
		return &ValidationError{Message: string(body)}
	case 429:
		return &RateLimitError{Message: "rate limit exceeded"}
	default:
		return &Error{Message: string(body), StatusCode: statusCode}
	}
}

// Health checks the API server health.
func (c *Client) Health(ctx context.Context) (*HealthResponse, error) {
	var result HealthResponse
	err := c.request(ctx, http.MethodGet, "/health", nil, &result)
	return &result, err
}

// HealthResponse represents the health check response.
type HealthResponse struct {
	Status  string `json:"status"`
	Version string `json:"version"`
}

// =============================================================================
// Error Types
// =============================================================================

// Error represents a generic API error.
type Error struct {
	Message    string
	Code       string
	StatusCode int
}

func (e *Error) Error() string {
	if e.Code != "" {
		return fmt.Sprintf("[%s] %s", e.Code, e.Message)
	}
	return e.Message
}

// AuthenticationError represents an authentication failure.
type AuthenticationError struct {
	Message string
}

func (e *AuthenticationError) Error() string {
	return "authentication error: " + e.Message
}

// NotFoundError represents a resource not found error.
type NotFoundError struct {
	Message string
}

func (e *NotFoundError) Error() string {
	return "not found: " + e.Message
}

// ValidationError represents a validation error.
type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return "validation error: " + e.Message
}

// RateLimitError represents a rate limit exceeded error.
type RateLimitError struct {
	Message    string
	RetryAfter int
}

func (e *RateLimitError) Error() string {
	return "rate limit exceeded: " + e.Message
}

// =============================================================================
// Models
// =============================================================================

// Profile represents a browser profile.
type Profile struct {
	ID           string             `json:"id"`
	Name         string             `json:"name"`
	OS           string             `json:"os"`
	Browser      string             `json:"browser"`
	UserAgent    string             `json:"userAgent,omitempty"`
	Viewport     *Viewport          `json:"viewport,omitempty"`
	Proxy        *ProxyConfig       `json:"proxy,omitempty"`
	Fingerprint  *FingerprintConfig `json:"fingerprint,omitempty"`
	Cookies      []Cookie           `json:"cookies,omitempty"`
	LocalStorage map[string]string  `json:"localStorage,omitempty"`
	CreatedAt    time.Time          `json:"createdAt"`
	UpdatedAt    time.Time          `json:"updatedAt"`
	Status       string             `json:"status"`
}

// Viewport represents browser viewport dimensions.
type Viewport struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

// ProxyConfig represents proxy configuration.
type ProxyConfig struct {
	Enabled  bool   `json:"enabled"`
	Type     string `json:"type"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
}

// FingerprintConfig represents fingerprint configuration.
type FingerprintConfig struct {
	Canvas              bool   `json:"canvas"`
	WebGL               bool   `json:"webgl"`
	Audio               bool   `json:"audio"`
	Fonts               bool   `json:"fonts"`
	Timezone            string `json:"timezone,omitempty"`
	Language            string `json:"language,omitempty"`
	HardwareConcurrency int    `json:"hardwareConcurrency,omitempty"`
	DeviceMemory        int    `json:"deviceMemory,omitempty"`
	WebGLVendor         string `json:"webglVendor,omitempty"`
	WebGLRenderer       string `json:"webglRenderer,omitempty"`
}

// Cookie represents a browser cookie.
type Cookie struct {
	Name     string `json:"name"`
	Value    string `json:"value"`
	Domain   string `json:"domain"`
	Path     string `json:"path,omitempty"`
	Expires  int64  `json:"expires,omitempty"`
	HTTPOnly bool   `json:"httpOnly,omitempty"`
	Secure   bool   `json:"secure,omitempty"`
	SameSite string `json:"sameSite,omitempty"`
}

// Session represents a browser session.
type Session struct {
	ID             string    `json:"id"`
	ProfileID      string    `json:"profileId"`
	Status         string    `json:"status"`
	WSEndpoint     string    `json:"wsEndpoint,omitempty"`
	CDPEndpoint    string    `json:"cdpEndpoint,omitempty"`
	StartedAt      time.Time `json:"startedAt,omitempty"`
	DetectionScore float64   `json:"detectionScore,omitempty"`
}

// Proxy represents a proxy server.
type Proxy struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"`
	Host        string    `json:"host"`
	Port        int       `json:"port"`
	Username    string    `json:"username,omitempty"`
	Password    string    `json:"password,omitempty"`
	Country     string    `json:"country,omitempty"`
	Status      string    `json:"status"`
	LastChecked time.Time `json:"lastChecked,omitempty"`
}

// DetectionScore represents a detection score result.
type DetectionScore struct {
	Score   float64            `json:"score"`
	Details map[string]float64 `json:"details,omitempty"`
}

// DashboardStats represents dashboard statistics.
type DashboardStats struct {
	TotalProfiles         int     `json:"totalProfiles"`
	ActiveProfiles        int     `json:"activeProfiles"`
	TotalSessions         int     `json:"totalSessions"`
	ActiveSessions        int     `json:"activeSessions"`
	AverageDetectionScore float64 `json:"averageDetectionScore"`
	SuccessRate           float64 `json:"successRate"`
}

// =============================================================================
// Request Options
// =============================================================================

// CreateProfileOptions represents options for creating a profile.
type CreateProfileOptions struct {
	Name        string             `json:"name"`
	OS          string             `json:"os,omitempty"`
	Browser     string             `json:"browser,omitempty"`
	UserAgent   string             `json:"userAgent,omitempty"`
	Viewport    *Viewport          `json:"viewport,omitempty"`
	Proxy       *ProxyConfig       `json:"proxy,omitempty"`
	Fingerprint *FingerprintConfig `json:"fingerprint,omitempty"`
}

// LaunchOptions represents options for launching a session.
type LaunchOptions struct {
	Headless bool     `json:"headless,omitempty"`
	Args     []string `json:"args,omitempty"`
	Timeout  int      `json:"timeout,omitempty"`
}

// ListOptions represents options for list operations.
type ListOptions struct {
	Page  int `json:"page,omitempty"`
	Limit int `json:"limit,omitempty"`
}

// =============================================================================
// Services
// =============================================================================

// ProfilesService handles profile operations.
type ProfilesService struct {
	client *Client
}

// List returns all profiles.
func (s *ProfilesService) List(ctx context.Context, opts *ListOptions) ([]Profile, error) {
	path := "/profiles"
	if opts != nil {
		params := url.Values{}
		if opts.Page > 0 {
			params.Set("page", fmt.Sprintf("%d", opts.Page))
		}
		if opts.Limit > 0 {
			params.Set("limit", fmt.Sprintf("%d", opts.Limit))
		}
		if len(params) > 0 {
			path += "?" + params.Encode()
		}
	}

	var result []Profile
	err := s.client.request(ctx, http.MethodGet, path, nil, &result)
	return result, err
}

// Get returns a profile by ID.
func (s *ProfilesService) Get(ctx context.Context, id string) (*Profile, error) {
	var result Profile
	err := s.client.request(ctx, http.MethodGet, "/profiles/"+id, nil, &result)
	return &result, err
}

// Create creates a new profile.
func (s *ProfilesService) Create(ctx context.Context, opts CreateProfileOptions) (*Profile, error) {
	var result Profile
	err := s.client.request(ctx, http.MethodPost, "/profiles", opts, &result)
	return &result, err
}

// Update updates a profile.
func (s *ProfilesService) Update(ctx context.Context, id string, updates map[string]interface{}) (*Profile, error) {
	var result Profile
	err := s.client.request(ctx, http.MethodPut, "/profiles/"+id, updates, &result)
	return &result, err
}

// Delete deletes a profile.
func (s *ProfilesService) Delete(ctx context.Context, id string) error {
	return s.client.request(ctx, http.MethodDelete, "/profiles/"+id, nil, nil)
}

// SessionsService handles session operations.
type SessionsService struct {
	client *Client
}

// List returns all sessions.
func (s *SessionsService) List(ctx context.Context) ([]Session, error) {
	var result []Session
	err := s.client.request(ctx, http.MethodGet, "/sessions", nil, &result)
	return result, err
}

// Get returns a session by ID.
func (s *SessionsService) Get(ctx context.Context, id string) (*Session, error) {
	var result Session
	err := s.client.request(ctx, http.MethodGet, "/sessions/"+id, nil, &result)
	return &result, err
}

// Launch launches a new browser session.
func (s *SessionsService) Launch(ctx context.Context, profileID string, opts *LaunchOptions) (*Session, error) {
	var result Session
	err := s.client.request(ctx, http.MethodPost, "/profiles/"+profileID+"/launch", opts, &result)
	return &result, err
}

// Stop stops a browser session.
func (s *SessionsService) Stop(ctx context.Context, id string) error {
	return s.client.request(ctx, http.MethodPost, "/sessions/"+id+"/stop", nil, nil)
}

// GetDetectionScore returns the detection score for a session.
func (s *SessionsService) GetDetectionScore(ctx context.Context, id string) (*DetectionScore, error) {
	var result DetectionScore
	err := s.client.request(ctx, http.MethodGet, "/sessions/"+id+"/detection-score", nil, &result)
	return &result, err
}

// Navigate navigates to a URL.
func (s *SessionsService) Navigate(ctx context.Context, id string, url string) error {
	return s.client.request(ctx, http.MethodPost, "/sessions/"+id+"/navigate", map[string]string{"url": url}, nil)
}

// Execute executes JavaScript in the browser.
func (s *SessionsService) Execute(ctx context.Context, id string, script string) (interface{}, error) {
	var result interface{}
	err := s.client.request(ctx, http.MethodPost, "/sessions/"+id+"/execute", map[string]string{"script": script}, &result)
	return result, err
}

// ProxiesService handles proxy operations.
type ProxiesService struct {
	client *Client
}

// List returns all proxies.
func (s *ProxiesService) List(ctx context.Context) ([]Proxy, error) {
	var result []Proxy
	err := s.client.request(ctx, http.MethodGet, "/proxies", nil, &result)
	return result, err
}

// Get returns a proxy by ID.
func (s *ProxiesService) Get(ctx context.Context, id string) (*Proxy, error) {
	var result Proxy
	err := s.client.request(ctx, http.MethodGet, "/proxies/"+id, nil, &result)
	return &result, err
}

// Create creates a new proxy.
func (s *ProxiesService) Create(ctx context.Context, proxy Proxy) (*Proxy, error) {
	var result Proxy
	err := s.client.request(ctx, http.MethodPost, "/proxies", proxy, &result)
	return &result, err
}

// Delete deletes a proxy.
func (s *ProxiesService) Delete(ctx context.Context, id string) error {
	return s.client.request(ctx, http.MethodDelete, "/proxies/"+id, nil, nil)
}

// Test tests a proxy connection.
func (s *ProxiesService) Test(ctx context.Context, id string) (map[string]interface{}, error) {
	var result map[string]interface{}
	err := s.client.request(ctx, http.MethodPost, "/proxies/"+id+"/test", nil, &result)
	return result, err
}

// AnalyticsService handles analytics operations.
type AnalyticsService struct {
	client *Client
}

// GetDashboard returns dashboard statistics.
func (s *AnalyticsService) GetDashboard(ctx context.Context) (*DashboardStats, error) {
	var result DashboardStats
	err := s.client.request(ctx, http.MethodGet, "/analytics/dashboard", nil, &result)
	return &result, err
}
