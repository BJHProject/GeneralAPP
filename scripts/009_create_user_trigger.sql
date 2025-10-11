-- Create a trigger to automatically create user records and grant signup bonus
-- when a new user signs up via Supabase Auth

-- First, ensure the users table has the correct structure
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS membership_tier text DEFAULT 'free';

-- Create the trigger function that runs when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_credits integer := 3000;
BEGIN
  -- Insert the new user into public.users
  INSERT INTO public.users (
    id,
    email,
    name,
    image,
    credits,
    membership_tier,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    new_credits,
    'free',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create a credit ledger entry for the signup bonus
  INSERT INTO public.credit_ledger (
    id,
    user_id,
    amount,
    description,
    operation_type,
    balance_after,
    created_at
  )
  VALUES (
    gen_random_uuid(),
    new.id,
    new_credits,
    'Welcome bonus - 3000 diamonds for new users',
    'signup',
    new_credits,
    now()
  )
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies for users table to allow reading own data
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;

CREATE POLICY "Users can view own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Allow service role to insert users (for the trigger)
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;

CREATE POLICY "Service role can insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Update RLS policies for credit_ledger to allow users to view their own ledger
DROP POLICY IF EXISTS "Users can view own ledger" ON public.credit_ledger;

CREATE POLICY "Users can view own ledger"
  ON public.credit_ledger
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow service role to insert ledger entries (for the trigger and credit operations)
DROP POLICY IF EXISTS "Service role can insert ledger" ON public.credit_ledger;

CREATE POLICY "Service role can insert ledger"
  ON public.credit_ledger
  FOR INSERT
  WITH CHECK (true);

-- Enable RLS on both tables if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
