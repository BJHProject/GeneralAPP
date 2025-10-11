# Database Scripts

This folder contains SQL scripts for setting up and maintaining the database.

## Active Scripts (Run in order)

1. **014_recreate_user_sessions.sql** - Creates user_sessions table with RLS policies
2. **015_recreate_images_table.sql** - Creates images table with RLS policies
3. **016_recreate_videos_table.sql** - Creates videos table with RLS policies
4. **017_recreate_credit_system.sql** - Creates credit system with user_credits table
5. **018_recreate_media_table.sql** - Creates unified media table for images/videos
6. **019_update_credit_system.sql** - Adds credit functions (charge_credits, grant_signup_bonus)
7. **020_fix_rls_policies.sql** - Fixes and updates all RLS policies

## Optional Scripts

- **002_create_user_sessions_v2.sql** - Alternative version (not needed if 014 ran successfully)

## Notes

- All scripts are idempotent (safe to run multiple times)
- Scripts drop existing policies before recreating them
- Use `IF NOT EXISTS` for tables and indexes
- Production database: Supabase
