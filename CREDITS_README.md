# Credit System with Supabase

This app uses a credit-based system for AI generation features. Credits are stored in Supabase and deducted for each generation.

## Credit Costs

- **Image Generation**: 500 credits
- **Image Edit**: 1,000 credits  
- **Video (3 seconds)**: 2,000 credits
- **Video (5 seconds)**: 3,000 credits

## Setup

### 1. Run the SQL Script

Execute the credit system SQL script to create the necessary tables:

\`\`\`sql
-- Run scripts/006_create_credit_system.sql in Supabase
\`\`\`

This creates:
- `users` table with credit balance
- `credit_ledger` table for transaction history
- `idempotency_keys` table for duplicate prevention

### 2. How It Works

**New Users:**
- Users sign up through Supabase Auth (email/password or OAuth)
- On first generation, a user record is created with 3000 credits

**Credit Deduction:**
- Each generation checks credit balance before processing
- Credits are deducted atomically using database transactions
- All transactions are logged in the credit_ledger table

**Idempotency:**
- Each request includes a unique idempotency key
- Duplicate requests return cached results without additional charges

## Adding Credits

### Admin Panel Method

1. Go to `/admin-control` and enter the admin password
2. Use the Credit Manager to select a user and add credits
3. Optionally provide a reason for the credit addition

### Direct Database Method

Run this SQL in Supabase:

\`\`\`sql
-- Add 5000 credits to a user
INSERT INTO credit_ledger (user_id, delta, reason, created_at)
VALUES ('user-email@example.com', 5000, 'manual_refill', NOW());

-- Update user's total credits
UPDATE users 
SET credits = credits + 5000 
WHERE id = 'user-email@example.com';
\`\`\`

## API Endpoints

### GET /api/user/credits
Get current user's credit balance.

**Response:**
\`\`\`json
{
  "credits": 3000,
  "membershipTier": "free"
}
\`\`\`

### GET /api/user/ledger  
Get user's credit transaction history.

**Response:**
\`\`\`json
{
  "ledger": [
    {
      "id": "...",
      "delta": -500,
      "reason": "image",
      "created_at": "2025-01-10T..."
    }
  ]
}
\`\`\`

### POST /api/user/add-credits
Add credits to a user (admin only).

**Request:**
\`\`\`json
{
  "userId": "user-email@example.com",
  "amount": 5000,
  "reason": "purchase"
}
\`\`\`

## Viewing Credit Data

Use the Supabase dashboard to view:
- User credit balances in the `users` table
- Transaction history in the `credit_ledger` table
- Idempotency keys in the `idempotency_keys` table

## Testing

1. Sign up a new user
2. Check that they receive 3000 credits on first generation
3. Generate content and verify credits are deducted
4. Check the credit_ledger for transaction history
5. Try the same request twice with the same idempotency key (should not charge twice)
\`\`\`
