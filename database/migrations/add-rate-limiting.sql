-- Database-backed rate limiting for production scalability
-- This replaces in-memory rate limiting to work across multiple server instances

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('user', 'ip')),
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier, type, window_start)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
ON rate_limits(identifier, type, window_end) 
WHERE window_end > NOW();

-- Function to check and increment rate limit atomically
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_type TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
) RETURNS TABLE (
  allowed BOOLEAN,
  current_count INTEGER,
  window_end TIMESTAMPTZ,
  remaining INTEGER
) AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_current_count INTEGER;
BEGIN
  -- Calculate current window
  v_window_start := DATE_TRUNC('minute', NOW());
  v_window_end := v_window_start + (p_window_seconds || ' seconds')::INTERVAL;

  -- Try to get or create the rate limit entry
  INSERT INTO rate_limits (identifier, type, request_count, window_start, window_end)
  VALUES (p_identifier, p_type, 1, v_window_start, v_window_end)
  ON CONFLICT (identifier, type, window_start) 
  DO UPDATE SET 
    request_count = rate_limits.request_count + 1,
    updated_at = NOW()
  RETURNING rate_limits.request_count, rate_limits.window_end
  INTO v_current_count, v_window_end;

  -- Return the result
  RETURN QUERY SELECT 
    v_current_count <= p_max_requests AS allowed,
    v_current_count AS current_count,
    v_window_end AS window_end,
    GREATEST(0, p_max_requests - v_current_count) AS remaining;
END;
$$ LANGUAGE plpgsql;

-- Cleanup function to remove expired entries (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits() 
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limits WHERE window_end < NOW() - INTERVAL '1 hour';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage rate limits
CREATE POLICY "Service role can manage rate limits" ON rate_limits
  FOR ALL USING (true);

-- Add comment for documentation
COMMENT ON TABLE rate_limits IS 'Database-backed rate limiting for production scalability across multiple server instances';
COMMENT ON FUNCTION check_rate_limit IS 'Atomically checks and increments rate limit counter, returns whether request is allowed';
