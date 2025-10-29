-- Migration: Add crypto_purchases table for NOWPayments integration
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS crypto_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id TEXT UNIQUE,
  payment_id TEXT UNIQUE,
  amount_usd DECIMAL(10, 2) NOT NULL,
  credits_amount INTEGER NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'waiting',
  pay_currency TEXT,
  actually_paid DECIMAL(20, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  credited BOOLEAN DEFAULT false NOT NULL
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_crypto_purchases_user_id ON crypto_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_purchases_invoice_id ON crypto_purchases(invoice_id);
CREATE INDEX IF NOT EXISTS idx_crypto_purchases_payment_id ON crypto_purchases(payment_id);
CREATE INDEX IF NOT EXISTS idx_crypto_purchases_status ON crypto_purchases(payment_status);

-- Row Level Security
ALTER TABLE crypto_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases"
  ON crypto_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can manage purchases (server-side only)
CREATE POLICY "Service role can manage purchases"
  ON crypto_purchases FOR ALL
  USING (auth.role() = 'service_role');

-- Atomic credit addition function for crypto purchases
CREATE OR REPLACE FUNCTION atomic_add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_operation_type TEXT,
  p_description TEXT,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE (
  new_balance INTEGER,
  success BOOLEAN
) AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_existing_key TEXT;
BEGIN
  -- Check for existing idempotency key
  IF p_idempotency_key IS NOT NULL THEN
    SELECT key INTO v_existing_key
    FROM idempotency_keys
    WHERE key = p_idempotency_key
      AND user_id = p_user_id
      AND status = 'completed'
    LIMIT 1;

    IF v_existing_key IS NOT NULL THEN
      -- Already processed, return current balance
      SELECT credits INTO v_current_balance
      FROM users
      WHERE id = p_user_id;

      RETURN QUERY SELECT v_current_balance, FALSE;
      RETURN;
    END IF;

    -- Insert idempotency key as processing
    INSERT INTO idempotency_keys (key, user_id, status, created_at)
    VALUES (p_idempotency_key, p_user_id, 'processing', NOW())
    ON CONFLICT (key) DO NOTHING;

    -- Check if we inserted it (if not, another request is processing)
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Request already being processed';
    END IF;
  END IF;

  -- Get current balance and lock the row
  SELECT credits INTO v_current_balance
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance + p_amount;

  -- Update user credits
  UPDATE users
  SET credits = v_new_balance
  WHERE id = p_user_id;

  -- Insert ledger entry
  INSERT INTO credit_ledger (
    user_id,
    delta,
    balance_after,
    operation_type,
    description,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    p_amount,
    v_new_balance,
    p_operation_type,
    p_description,
    p_metadata,
    NOW()
  );

  -- Mark idempotency key as completed
  IF p_idempotency_key IS NOT NULL THEN
    UPDATE idempotency_keys
    SET status = 'completed'
    WHERE key = p_idempotency_key;
  END IF;

  RETURN QUERY SELECT v_new_balance, TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
