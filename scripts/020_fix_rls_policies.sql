-- Fix RLS policies to allow trigger and service operations

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can insert own record" ON public.users;
DROP POLICY IF EXISTS "Users can view own ledger" ON public.credit_ledger;
DROP POLICY IF EXISTS "Service role can insert ledger" ON public.credit_ledger;
DROP POLICY IF EXISTS "Service role can manage ledger" ON public.credit_ledger;
DROP POLICY IF EXISTS "System can insert ledger entries" ON public.credit_ledger;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role can manage users"
  ON public.users
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can insert own record"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Credit ledger policies
CREATE POLICY "Users can view own ledger"
  ON public.credit_ledger
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage ledger"
  ON public.credit_ledger
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "System can insert ledger entries"
  ON public.credit_ledger
  FOR INSERT
  WITH CHECK (true);
