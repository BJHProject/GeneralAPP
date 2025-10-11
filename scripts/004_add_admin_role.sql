-- Add is_admin column to user_sessions table
ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create an index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_admin ON public.user_sessions(is_admin) WHERE is_admin = TRUE;

-- Update RLS policies to allow admins to view all sessions
CREATE POLICY "Admins can view all sessions"
  ON public.user_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_sessions
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- Allow admins to view all images
CREATE POLICY "Admins can view all images"
  ON public.images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_sessions
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );
