# Credit System Setup Guide

This app now uses a Supabase-based credit system for managing user credits and tracking usage.

## Features

- **3000 free credits** for new users on signup
- **Credit costs**:
  - Image generation: 500 credits
  - Image editing: 1000 credits
  - Video 3s: 2000 credits
  - Video 5s: 3000 credits
- **Atomic transactions** with idempotency protection
- **Full audit trail** in credit_ledger table
- **Google OAuth** authentication

## Setup Steps

### 1. Run Database Migration

Execute the SQL script to create the required tables:

\`\`\`bash
# Run this in your Supabase SQL editor or via the v0 interface
scripts/006_create_credit_system.sql
\`\`\`

This creates:
- `users` table (email, credits, etc.)
- `credit_ledger` table (transaction history)
- `idempotency_keys` table (prevent duplicate charges)

### 2. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
7. Copy the Client ID and Client Secret

### 3. Add Environment Variables

Add these to your Vercel project or `.env.local`:

\`\`\`env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_SECRET=your_random_secret_key  # Generate with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000  # Change to your production URL

# Admin (for adding credits manually)
ADMIN_PASSWORD=your_admin_password
\`\`\`

### 4. Test the System

1. Sign in with Google
2. Check that you receive 3000 credits
3. Generate an image/video/edit
4. Verify credits are deducted
5. Check the credit_ledger table for transaction history

## Adding Credits Manually

To add credits to a user account, use the admin API:

\`\`\`bash
curl -X POST https://yourdomain.com/api/user/add-credits \
  -H "Content-Type: application/json" \
  -d '{
    "password": "your_admin_password",
    "email": "user@example.com",
    "amount": 5000
  }'
\`\`\`

Or create an admin UI page for this functionality.

## Database Schema

### users
- `id` (UUID, primary key)
- `email` (text, unique)
- `name` (text, nullable)
- `image` (text, nullable)
- `credits` (integer, default 3000)
- `created_at`, `updated_at` (timestamps)

### credit_ledger
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key)
- `amount` (integer, negative for deductions)
- `balance_after` (integer)
- `operation_type` (text: IMAGE, EDIT, VIDEO_3S, VIDEO_5S, BONUS)
- `description` (text)
- `metadata` (jsonb)
- `created_at` (timestamp)

### idempotency_keys
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key)
- `idempotency_key` (text)
- `created_at` (timestamp)
- Unique constraint on (user_id, idempotency_key)

## API Endpoints

- `GET /api/user/credits` - Get current user's credit balance
- `GET /api/user/ledger` - Get user's transaction history
- `POST /api/user/add-credits` - Admin endpoint to add credits

## Troubleshooting

**Issue**: User not getting credits on signup
- Check that the SQL migration ran successfully
- Verify the `ensureUserExists` function is being called in auth.ts
- Check server logs for errors

**Issue**: Credits not deducting
- Verify the generation APIs are calling `chargeCredits`
- Check for sufficient credits before generation
- Review credit_ledger table for transaction records

**Issue**: Google OAuth not working
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set
- Check redirect URIs match exactly in Google Console
- Ensure NEXTAUTH_URL is correct for your environment
