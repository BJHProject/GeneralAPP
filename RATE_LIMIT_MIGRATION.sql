-- ============================================
-- RATE LIMITING MIGRATION
-- Run this in Supabase SQL Editor after SUPABASE_FIX_MIGRATION.sql
-- ============================================

-- 1. Create rate_limits table if it doesn't exist
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('user', 'ip')),
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
    ON rate_limits(identifier, type, window_end);

CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup 
    ON rate_limits(window_end);

-- 3. Create the check_rate_limit function
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier TEXT,
    p_type TEXT,
    p_max_requests INTEGER,
    p_window_seconds INTEGER
)
RETURNS TABLE(
    allowed BOOLEAN,
    current_count INTEGER,
    window_end TIMESTAMPTZ,
    remaining INTEGER
) AS $$
DECLARE
    v_window_start TIMESTAMPTZ;
    v_window_end TIMESTAMPTZ;
    v_current_count INTEGER;
    v_existing_record RECORD;
BEGIN
    -- Calculate window boundaries
    v_window_start := NOW();
    v_window_end := v_window_start + (p_window_seconds || ' seconds')::INTERVAL;

    -- Try to find existing active window
    SELECT * INTO v_existing_record
    FROM rate_limits
    WHERE identifier = p_identifier
      AND type = p_type
      AND window_end > NOW()
    ORDER BY window_end DESC
    LIMIT 1
    FOR UPDATE;

    IF v_existing_record IS NULL THEN
        -- No active window, create new one
        INSERT INTO rate_limits (
            identifier,
            type,
            window_start,
            window_end,
            request_count
        ) VALUES (
            p_identifier,
            p_type,
            v_window_start,
            v_window_end,
            1
        );
        
        v_current_count := 1;
        
        RETURN QUERY SELECT 
            true AS allowed,
            v_current_count AS current_count,
            v_window_end AS window_end,
            (p_max_requests - v_current_count) AS remaining;
    ELSE
        -- Active window exists, increment count
        v_current_count := v_existing_record.request_count + 1;
        
        UPDATE rate_limits
        SET 
            request_count = v_current_count,
            updated_at = NOW()
        WHERE id = v_existing_record.id;
        
        RETURN QUERY SELECT 
            (v_current_count <= p_max_requests) AS allowed,
            v_current_count AS current_count,
            v_existing_record.window_end AS window_end,
            GREATEST(0, p_max_requests - v_current_count) AS remaining;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Create cleanup function for expired rate limits
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM rate_limits
    WHERE window_end < NOW() - INTERVAL '1 hour';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_rate_limits TO service_role;

-- 6. Enable Row Level Security
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies (users can only see their own rate limits)
DROP POLICY IF EXISTS "Users can view own rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Service role can manage rate limits" ON rate_limits;

CREATE POLICY "Users can view own rate limits"
    ON rate_limits FOR SELECT
    USING (
        (type = 'user' AND identifier = auth.uid()::text)
        OR auth.role() = 'service_role'
    );

CREATE POLICY "Service role can manage rate limits"
    ON rate_limits FOR ALL
    USING (auth.role() = 'service_role');

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Rate limiting migration completed successfully!';
END $$;
