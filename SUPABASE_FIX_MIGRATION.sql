-- ============================================
-- SAFE MIGRATION - Only missing parts
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Drop the existing policies to recreate them (safe operation)
DROP POLICY IF EXISTS "Users can view own jobs" ON generation_jobs;
DROP POLICY IF EXISTS "Service role can manage jobs" ON generation_jobs;

-- 2. Make delta column NOT NULL (it exists but might allow nulls)
ALTER TABLE credit_ledger 
    ALTER COLUMN delta SET NOT NULL,
    ALTER COLUMN delta SET DEFAULT 0;

-- 3. Prevent updates and deletes on credit_ledger (append-only)
DROP RULE IF EXISTS credit_ledger_no_update ON credit_ledger;
DROP RULE IF EXISTS credit_ledger_no_delete ON credit_ledger;

CREATE RULE credit_ledger_no_update AS 
    ON UPDATE TO credit_ledger 
    DO INSTEAD NOTHING;

CREATE RULE credit_ledger_no_delete AS 
    ON DELETE TO credit_ledger 
    DO INSTEAD NOTHING;

-- 4. Create/Replace the atomic credit charge function
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

    -- Insert immutable ledger entry (using delta, not amount)
    INSERT INTO credit_ledger (
        user_id,
        delta,
        amount,
        balance_after,
        operation_type,
        description,
        reason,
        metadata
    ) VALUES (
        p_user_id,
        -p_cost,
        -p_cost,
        v_new_balance,
        p_operation_type,
        p_operation_type || ' generation',
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

-- 5. Create/Replace refund function
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

    -- Record refund in ledger (using delta and amount)
    INSERT INTO credit_ledger (
        user_id,
        delta,
        amount,
        balance_after,
        operation_type,
        description,
        reason,
        metadata
    ) VALUES (
        p_user_id,
        p_amount,
        p_amount,
        v_new_balance,
        'refund',
        'Refund: ' || p_reason,
        p_reason,
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

-- 6. Enable Row Level Security (safe to re-run)
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;

-- 7. Recreate policies (after dropping them above)
CREATE POLICY "Users can view own jobs"
    ON generation_jobs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage jobs"
    ON generation_jobs FOR ALL
    USING (auth.role() = 'service_role');

-- 8. Add balance check constraint (will error if exists, that's OK)
DO $$ 
BEGIN
    ALTER TABLE users ADD CONSTRAINT users_credits_non_negative CHECK (credits >= 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 9. Create audit trigger for credit_ledger
DROP TRIGGER IF EXISTS verify_ledger_before_insert ON credit_ledger;
DROP FUNCTION IF EXISTS verify_ledger_delta();

CREATE FUNCTION verify_ledger_delta()
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

-- 10. Grant necessary permissions
GRANT SELECT ON generation_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION atomic_charge_credits TO service_role;
GRANT EXECUTE ON FUNCTION refund_credits TO service_role;

-- 11. Add unique index on generation_jobs idempotency_key if missing
CREATE UNIQUE INDEX IF NOT EXISTS idx_generation_jobs_idempotency 
    ON generation_jobs(idempotency_key) 
    WHERE idempotency_key IS NOT NULL;
