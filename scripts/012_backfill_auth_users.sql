-- Backfill existing auth.users into public.users
-- This script is idempotent and safe to run multiple times

DO $$
DECLARE
  auth_user RECORD;
  user_email TEXT;
  user_name TEXT;
  user_avatar TEXT;
  existing_user_id UUID;
BEGIN
  -- Loop through all users in auth.users
  FOR auth_user IN 
    SELECT id, email, raw_user_meta_data, created_at
    FROM auth.users
  LOOP
    -- Check if user already exists in public.users
    SELECT id INTO existing_user_id
    FROM public.users
    WHERE id = auth_user.id;

    -- Only create if doesn't exist
    IF existing_user_id IS NULL THEN
      -- Extract metadata
      user_email := COALESCE(auth_user.email, auth_user.raw_user_meta_data->>'email');
      user_name := COALESCE(
        auth_user.raw_user_meta_data->>'full_name',
        auth_user.raw_user_meta_data->>'name',
        split_part(user_email, '@', 1)
      );
      user_avatar := auth_user.raw_user_meta_data->>'avatar_url';

      -- Insert user with 3000 credits
      INSERT INTO public.users (
        id,
        email,
        name,
        image,
        membership_tier,
        credits,
        created_at,
        updated_at
      )
      VALUES (
        auth_user.id,
        user_email,
        user_name,
        user_avatar,
        'free',
        3000,
        auth_user.created_at,
        NOW()
      );

      -- Create credit ledger entry
      INSERT INTO public.credit_ledger (
        id,
        user_id,
        amount,
        operation_type,
        description,
        balance_after,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        auth_user.id,
        3000,
        'signup',
        'Welcome bonus (backfilled)',
        3000,
        auth_user.created_at
      );

      RAISE NOTICE 'Created user: % (%)', user_name, user_email;
    ELSE
      RAISE NOTICE 'User already exists: %', user_email;
    END IF;
  END LOOP;
END $$;
