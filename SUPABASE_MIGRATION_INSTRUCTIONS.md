# Supabase Database Migration Instructions

## ⚠️ CRITICAL: Your app won't work until you run these migrations in Supabase!

Your code expects a new database schema, but your Supabase database still has the old schema. Follow these steps to fix it:

---

## Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

---

## Step 2: Run Migration 1 - Atomic Credit System

**Copy this entire SQL and paste it into the SQL Editor, then click RUN:**

```sql
-- ============================================
-- ATOMIC CREDIT SYSTEM MIGRATION
-- Implements secure, atomic credit operations
-- ============================================

-- 1. Create generation_jobs table for tracking
CREATE TABLE IF NOT EXISTS generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    cost INTEGER NOT NULL,
    idempotency_key TEXT,
    result_url TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_id ON generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_generation_jobs_idempotency ON generation_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 2. Add constraints to credit_ledger (make immutable and enforce delta)
ALTER TABLE credit_ledger 
    ALTER COLUMN delta SET NOT NULL,
    ALTER COLUMN delta SET DEFAULT 0;

-- Prevent updates and deletes on credit_ledger (append-only)
CREATE OR REPLACE RULE credit_ledger_no_update AS 
    ON UPDATE TO credit_ledger 
    DO INSTEAD NOTHING;

CREATE OR REPLACE RULE credit_ledger_no_delete AS 
    ON DELETE TO credit_ledger 
    DO INSTEAD NOTHING;

-- 3. Atomic credit charge function with job creation
CREATE OR REPLACE FUNCTION atomic_charge_credits(
    p_user_id UUID,
    p_operation_type TEXT,
    p_cost INTEGER,
    p_idempotency_key TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(job_id UUID, new_balance INTEGER) AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_job_id UUID;
BEGIN
    -- Lock the user row for update
    SELECT credits INTO v_current_balance
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;

    -- Check if user exists
    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Check sufficient balance
    IF v_current_balance < p_cost THEN
        RAISE EXCEPTION 'Insufficient credits: has % needs %', v_current_balance, p_cost;
    END IF;

    -- Calculate new balance
    v_new_balance := v_current_balance - p_cost;

    -- Update user balance
    UPDATE users
    SET credits = v_new_balance
    WHERE id = p_user_id;

    -- Create generation job
    INSERT INTO generation_jobs (
        user_id,
        operation_type,
        cost,
        idempotency_key,
        metadata,
        status
    ) VALUES (
        p_user_id,
        p_operation_type,
        p_cost,
        p_idempotency_key,
        p_metadata,
        'pending'
    ) RETURNING id INTO v_job_id;

    -- Insert immutable ledger entry
    INSERT INTO credit_ledger (
        user_id,
        delta,
        balance_after,
        operation_type,
        description,
        metadata
    ) VALUES (
        p_user_id,
        -p_cost,
        v_new_balance,
        p_operation_type,
        p_operation_type || ' generation',
        jsonb_build_object(
            'job_id', v_job_id,
            'idempotency_key', p_idempotency_key
        ) || p_metadata
    );

    -- Create idempotency record if key provided
    IF p_idempotency_key IS NOT NULL THEN
        INSERT INTO idempotency_keys (
            key,
            user_id,
            operation,
            status
        ) VALUES (
            p_idempotency_key,
            p_user_id,
            p_operation_type,
            'started'
        ) ON CONFLICT (key, user_id) DO NOTHING;
    END IF;

    -- Return job ID and new balance
    RETURN QUERY SELECT v_job_id, v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- 4. Refund function for failed generations
CREATE OR REPLACE FUNCTION refund_credits(
    p_user_id UUID,
    p_job_id UUID,
    p_amount INTEGER,
    p_reason TEXT
)
RETURNS INTEGER AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    -- Lock user row
    SELECT credits + p_amount INTO v_new_balance
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;

    -- Update balance
    UPDATE users
    SET credits = v_new_balance
    WHERE id = p_user_id;

    -- Record refund in ledger
    INSERT INTO credit_ledger (
        user_id,
        delta,
        balance_after,
        operation_type,
        description,
        metadata
    ) VALUES (
        p_user_id,
        p_amount,
        v_new_balance,
        'refund',
        'Refund: ' || p_reason,
        jsonb_build_object('job_id', p_job_id)
    );

    -- Mark job as refunded
    UPDATE generation_jobs
    SET 
        status = 'failed',
        error_message = 'Refunded: ' || p_reason,
        completed_at = NOW()
    WHERE id = p_job_id;

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- 5. Enable Row Level Security on generation_jobs
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own jobs
CREATE POLICY "Users can view own jobs"
    ON generation_jobs FOR SELECT
    USING (auth.uid() = user_id);

-- Only service role can insert/update jobs
CREATE POLICY "Service role can manage jobs"
    ON generation_jobs FOR ALL
    USING (auth.role() = 'service_role');

-- 6. Add balance check constraint
ALTER TABLE users 
    ADD CONSTRAINT users_credits_non_negative 
    CHECK (credits >= 0);

-- 7. Create audit trigger for credit_ledger
CREATE OR REPLACE FUNCTION verify_ledger_delta()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure delta is set
    IF NEW.delta IS NULL THEN
        RAISE EXCEPTION 'Delta cannot be NULL';
    END IF;

    -- Ensure balance_after is correct
    IF NEW.balance_after IS NULL THEN
        RAISE EXCEPTION 'Balance_after cannot be NULL';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER verify_ledger_before_insert
    BEFORE INSERT ON credit_ledger
    FOR EACH ROW
    EXECUTE FUNCTION verify_ledger_delta();

-- 8. Grant necessary permissions
GRANT SELECT ON generation_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION atomic_charge_credits TO service_role;
GRANT EXECUTE ON FUNCTION refund_credits TO service_role;
```

**Expected Result:** You should see "Success. No rows returned" (this is normal for schema changes)

---

## Step 3: Verify Migration 1 Worked

Run this query to verify:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'credit_ledger' 
ORDER BY ordinal_position;
```

**Expected:** You should see a `delta` column (integer type)

---

## Step 4: Check Rate Limiting Function

The rate limiting table exists, but let's verify the function signature. Run this:

```sql
SELECT 
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'check_rate_limit';
```

If it shows the function with 4 parameters `(p_identifier, p_type, p_max_requests, p_window_seconds)`, you're good!

If NOT, run Migration 2 below.

---

## Step 5: (If Needed) Run Migration 2 - Rate Limiting

**Only run this if Step 4 showed an incorrect function signature:**

```sql
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
```

---

## ✅ Final Verification

After running the migrations, test your app:

1. Try to generate an image
2. It should work without the "null value in column amount" error
3. Credits should be deducted properly

---

## Troubleshooting

### Error: "column delta does not exist"
- Your `credit_ledger` table might not have been created with a `delta` column
- Check your table structure in Supabase Table Editor
- You may need to add the column manually:
  ```sql
  ALTER TABLE credit_ledger ADD COLUMN IF NOT EXISTS delta INTEGER;
  ```

### Error: "constraint already exists"
- This is safe to ignore - it means part of the migration already ran

### Still getting errors?
- Take a screenshot of the error in Supabase SQL Editor
- Share it and we'll debug together
