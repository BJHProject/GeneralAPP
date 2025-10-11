-- Fix infinite recursion in RLS policies
-- Drop the problematic admin policies that cause infinite recursion

-- Drop the recursive admin policies
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admins can view all images" ON public.images;

-- The original policies from 001_create_user_sessions.sql are sufficient
-- Users can view their own sessions (this policy already exists and works)

-- For admin access, we'll use service role key in the API routes instead of RLS policies
-- This avoids the infinite recursion issue

-- Verify the existing policies are still in place
-- These should already exist from the original scripts:
-- 1. "Users can view their own sessions" on user_sessions
-- 2. "Users can insert their own sessions" on user_sessions
-- 3. "Users can view own images" on images (if it exists)
-- 4. "Users can insert own images" on images (if it exists)
