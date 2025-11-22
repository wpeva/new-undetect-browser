-- PostgreSQL Initialization Script for Cloud Anti-Detect Browser
-- Sets up database schema for profile and session management

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== Profiles Table ==========
-- Stores browser fingerprint profiles
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  fingerprint JSONB NOT NULL,
  config JSONB,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP,
  use_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_used ON profiles(last_used DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_tags ON profiles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_profiles_fingerprint ON profiles USING GIN(fingerprint);

-- ========== Sessions Table ==========
-- Tracks active and historical browser sessions
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  profile_id VARCHAR(255) REFERENCES profiles(id) ON DELETE SET NULL,
  config JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  cdp_url VARCHAR(512),
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_profile_id ON sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity DESC);

-- ========== Session Metrics Table ==========
-- Stores performance and usage metrics for sessions
CREATE TABLE IF NOT EXISTS session_metrics (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMP DEFAULT NOW(),
  request_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  memory_usage_mb DECIMAL(10, 2),
  cpu_usage_percent DECIMAL(5, 2),
  page_count INTEGER DEFAULT 0,
  avg_page_load_time_ms DECIMAL(10, 2)
);

CREATE INDEX IF NOT EXISTS idx_session_metrics_session_id ON session_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_session_metrics_timestamp ON session_metrics(timestamp DESC);

-- ========== Proxies Table ==========
-- Manages proxy configurations
CREATE TABLE IF NOT EXISTS proxies (
  id SERIAL PRIMARY KEY,
  protocol VARCHAR(20) NOT NULL, -- http, https, socks4, socks5
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL,
  username VARCHAR(255),
  password VARCHAR(255),
  country_code VARCHAR(2),
  city VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_checked TIMESTAMP,
  success_rate DECIMAL(5, 2) DEFAULT 100.00,
  avg_response_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proxies_country ON proxies(country_code);
CREATE INDEX IF NOT EXISTS idx_proxies_active ON proxies(is_active);
CREATE INDEX IF NOT EXISTS idx_proxies_success_rate ON proxies(success_rate DESC);

-- ========== Automation Scripts Table ==========
-- Stores reusable automation scripts
CREATE TABLE IF NOT EXISTS automation_scripts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  script TEXT NOT NULL,
  language VARCHAR(50) DEFAULT 'javascript',
  category VARCHAR(100),
  tags TEXT[],
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  use_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_automation_scripts_category ON automation_scripts(category);
CREATE INDEX IF NOT EXISTS idx_automation_scripts_tags ON automation_scripts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_automation_scripts_public ON automation_scripts(is_public);

-- ========== Logs Table ==========
-- Audit log for all operations
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  level VARCHAR(20), -- info, warning, error
  action VARCHAR(100), -- session_create, session_destroy, profile_create, etc.
  entity_type VARCHAR(50), -- session, profile, proxy, etc.
  entity_id VARCHAR(255),
  message TEXT,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_level ON audit_logs(level);

-- ========== Views ==========

-- Active sessions summary
CREATE OR REPLACE VIEW active_sessions_summary AS
SELECT
  s.id,
  s.profile_id,
  p.name AS profile_name,
  s.status,
  s.created_at,
  s.last_activity,
  EXTRACT(EPOCH FROM (NOW() - s.last_activity)) AS idle_seconds,
  sm.memory_usage_mb,
  sm.cpu_usage_percent,
  sm.request_count,
  sm.error_count
FROM sessions s
LEFT JOIN profiles p ON s.profile_id = p.id
LEFT JOIN LATERAL (
  SELECT *
  FROM session_metrics
  WHERE session_id = s.id
  ORDER BY timestamp DESC
  LIMIT 1
) sm ON TRUE
WHERE s.status IN ('active', 'idle');

-- Profile usage statistics
CREATE OR REPLACE VIEW profile_usage_stats AS
SELECT
  p.id,
  p.name,
  p.created_at,
  p.last_used,
  p.use_count,
  COUNT(s.id) AS total_sessions,
  COUNT(CASE WHEN s.status = 'active' THEN 1 END) AS active_sessions,
  AVG(EXTRACT(EPOCH FROM (COALESCE(s.closed_at, NOW()) - s.created_at))) AS avg_session_duration_seconds
FROM profiles p
LEFT JOIN sessions s ON s.profile_id = p.id
GROUP BY p.id, p.name, p.created_at, p.last_used, p.use_count;

-- System health metrics
CREATE OR REPLACE VIEW system_health_metrics AS
SELECT
  COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_sessions,
  COUNT(CASE WHEN status = 'idle' THEN 1 END) AS idle_sessions,
  COUNT(CASE WHEN status = 'unhealthy' THEN 1 END) AS unhealthy_sessions,
  AVG(CASE
    WHEN status IN ('active', 'idle') THEN
      EXTRACT(EPOCH FROM (NOW() - created_at))
  END) AS avg_session_age_seconds,
  (SELECT COUNT(*) FROM profiles) AS total_profiles,
  (SELECT COUNT(*) FROM proxies WHERE is_active = TRUE) AS active_proxies,
  (SELECT AVG(success_rate) FROM proxies WHERE is_active = TRUE) AS avg_proxy_success_rate
FROM sessions
WHERE status IN ('active', 'idle', 'unhealthy');

-- ========== Functions ==========

-- Function to update profile last_used timestamp
CREATE OR REPLACE FUNCTION update_profile_last_used()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.profile_id IS NOT NULL THEN
    UPDATE profiles
    SET
      last_used = NOW(),
      use_count = use_count + 1
    WHERE id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update profile usage
DROP TRIGGER IF EXISTS trigger_update_profile_last_used ON sessions;
CREATE TRIGGER trigger_update_profile_last_used
AFTER INSERT ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_profile_last_used();

-- Function to cleanup old sessions
CREATE OR REPLACE FUNCTION cleanup_old_sessions(days_to_keep INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions
  WHERE
    status = 'closed'
    AND closed_at < NOW() - (days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old logs
CREATE OR REPLACE FUNCTION cleanup_old_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ========== Sample Data (optional, for testing) ==========

-- Insert sample profiles
INSERT INTO profiles (id, name, fingerprint, config, tags) VALUES
  (
    'profile_sample_1',
    'Windows 10 - Chrome 120',
    '{"platform":"Win32","userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}'::JSONB,
    '{"stealthLevel":"advanced"}'::JSONB,
    ARRAY['windows', 'chrome', 'desktop']
  ),
  (
    'profile_sample_2',
    'MacOS - Safari 17',
    '{"platform":"MacIntel","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15"}'::JSONB,
    '{"stealthLevel":"paranoid"}'::JSONB,
    ARRAY['macos', 'safari', 'desktop']
  ),
  (
    'profile_sample_3',
    'Android - Chrome Mobile',
    '{"platform":"Linux armv81","userAgent":"Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36"}'::JSONB,
    '{"stealthLevel":"advanced"}'::JSONB,
    ARRAY['android', 'chrome', 'mobile']
  )
ON CONFLICT (id) DO NOTHING;

-- Insert sample proxies
INSERT INTO proxies (protocol, host, port, country_code, city) VALUES
  ('http', 'proxy1.example.com', 8080, 'US', 'New York'),
  ('socks5', 'proxy2.example.com', 1080, 'UK', 'London'),
  ('http', 'proxy3.example.com', 3128, 'DE', 'Berlin')
ON CONFLICT DO NOTHING;

-- Log initialization
INSERT INTO audit_logs (level, action, message) VALUES
  ('info', 'database_init', 'Database schema initialized successfully');

-- ========== Grants (adjust as needed) ==========
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO antidetect;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO antidetect;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO antidetect;

COMMIT;
