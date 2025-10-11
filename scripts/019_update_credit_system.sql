-- Migration to update credit system to match new requirements

-- 1. Add membership_tier to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS membership_tier TEXT DEFAULT 'free';

-- 2. Update credit_ledger table structure
-- Add new columns if they don't exist
ALTER TABLE public.credit_ledger 
ADD COLUMN IF NOT EXISTS delta INTEGER,
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS ref_id TEXT;

-- Migrate existing data from amount to delta (if amount column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'credit_ledger' AND column_name = 'amount') THEN
    UPDATE public.credit_ledger 
    SET delta = amount 
    WHERE delta IS NULL;
  END IF;
END $$;

-- Migrate existing data from operation_type to reason (if operation_type column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'credit_ledger' AND column_name = 'operation_type') THEN
    UPDATE public.credit_ledger 
    SET reason = CASE 
      WHEN operation_type = 'IMAGE' THEN 'image'
      WHEN operation_type = 'EDIT' THEN 'edit'
      WHEN operation_type = 'VIDEO_3S' THEN 'video3'
      WHEN operation_type = 'VIDEO_5S' THEN 'video5'
      WHEN operation_type = 'BONUS' THEN 'signup'
      WHEN operation_type = 'PURCHASE' THEN 'signup'
      ELSE LOWER(operation_type)
    END
    WHERE reason IS NULL;
  END IF;
END $$;

-- Make new columns NOT NULL after migration (only if they have data)
DO $$
BEGIN
  -- Only set NOT NULL if column exists and has no nulls
  IF NOT EXISTS (SELECT 1 FROM public.credit_ledger WHERE delta IS NULL) THEN
    ALTER TABLE public.credit_ledger ALTER COLUMN delta SET NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.credit_ledger WHERE reason IS NULL) THEN
    ALTER TABLE public.credit_ledger ALTER COLUMN reason SET NOT NULL;
  END IF;
END $$;

-- 3. Drop and recreate atomic credit charging function
DROP FUNCTION IF EXISTS public.charge_credits(UUID, INTEGER, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.charge_credits(
  p_user_id UUID,
  p_cost INTEGER,
  p_reason TEXT,
  p_ref_id TEXT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  new_balance INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Atomic update: only deduct if sufficient balance
  UPDATE public.users 
  SET credits = credits - p_cost 
  WHERE id = p_user_id 
    AND credits >= p_cost
  RETURNING credits INTO v_new_balance;

  -- Check if update succeeded
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'insufficient credits';
    RETURN;
  END IF;

  -- Insert ledger entry
  INSERT INTO public.credit_ledger (user_id, delta, reason, ref_id, balance_after)
  VALUES (p_user_id, -p_cost, p_reason, p_ref_id, v_new_balance);

  RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Drop and recreate function to grant signup bonus
DROP FUNCTION IF EXISTS public.grant_signup_bonus(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.grant_signup_bonus(
  p_user_id UUID,
  p_email TEXT,
  p_name TEXT DEFAULT NULL,
  p_image TEXT DEFAULT NULL
) RETURNS TABLE (
  user_id UUID,
  credits INTEGER,
  is_new_user BOOLEAN
) AS $$
DECLARE
  v_existing_user UUID;
  v_credits INTEGER;
BEGIN
  -- Check if user exists
  SELECT id, users.credits INTO v_existing_user, v_credits
  FROM public.users 
  WHERE id = p_user_id;

  IF v_existing_user IS NOT NULL THEN
    -- User already exists, return current state
    RETURN QUERY SELECT v_existing_user, v_credits, FALSE;
    RETURN;
  END IF;

  -- Create new user with signup bonus
  INSERT INTO public.users (id, email, name, image, membership_tier, credits)
  VALUES (p_user_id, p_email, p_name, p_image, 'free', 3000)
  RETURNING users.id, users.credits INTO v_existing_user, v_credits;

  -- Insert signup bonus ledger entry
  INSERT INTO public.credit_ledger (user_id, delta, reason, balance_after)
  VALUES (p_user_id, 3000, 'signup', 3000);

  RETURN QUERY SELECT v_existing_user, v_credits, TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
