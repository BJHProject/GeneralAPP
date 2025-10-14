-- Fix ambiguous column reference in check_rate_limit function
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
    WHERE rate_limits.identifier = p_identifier
      AND rate_limits.type = p_type
      AND rate_limits.window_end > NOW()
    ORDER BY rate_limits.window_end DESC
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
