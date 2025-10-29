# NOWPayments Crypto Payment Integration Setup

This guide will help you complete the setup for accepting cryptocurrency payments via NOWPayments.

## What's Already Done

✅ NOWPayments API package installed
✅ Crypto payment endpoints created
✅ Buy Credits page built with 4 packages
✅ Webhook signature validation implemented
✅ Atomic credit addition with idempotency protection
✅ Menu link added to header

## Database Setup Required

You need to run the SQL migration in your **Supabase SQL Editor** to create the necessary tables and functions.

### Steps:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of `database/migrations/add-crypto-purchases.sql`
4. Paste and run the SQL

This creates:
- `crypto_purchases` table to track all payment records
- `atomic_add_credits()` RPC function for secure, race-condition-free credit addition
- Row Level Security (RLS) policies

## Credit Packages

The system includes 4 credit packages:

| Package  | Price  | Credits  | Use Cases |
|----------|--------|----------|-----------|
| Starter  | $5.00  | 5,000    | ~10 image generations |
| Popular  | $9.99  | 10,000   | ~20 image generations |
| Pro      | $19.99 | 20,000   | ~40 image generations |
| Elite    | $49.99 | 50,000   | ~100 image generations |

## How It Works

### User Flow:
1. User clicks "Buy Credits" from the header menu
2. Selects a package on `/buy-credits` page
3. Gets redirected to NOWPayments hosted checkout
4. Pays with any of 160+ cryptocurrencies
5. Credits automatically added to account after payment confirmation

### Technical Flow:
1. **Invoice Creation** (`/api/crypto/create-invoice`):
   - Creates NOWPayments invoice
   - Records purchase in `crypto_purchases` table
   - Returns invoice URL for redirect

2. **Payment Processing** (NOWPayments):
   - User completes payment
   - NOWPayments sends webhook to `/api/crypto/ipn`

3. **Webhook Handler** (`/api/crypto/ipn`):
   - Validates HMAC SHA-512 signature
   - Updates payment status
   - When status = 'finished':
     - Calls `atomic_add_credits()` RPC
     - Uses idempotency key to prevent duplicate credits
     - Records transaction in credit ledger
     - Marks purchase as credited

## Security Features

### Webhook Security
- HMAC SHA-512 signature validation using IPN secret
- Only accepts signed requests from NOWPayments

### Database Security
- Service role client bypasses RLS for admin operations
- Row Level Security ensures users only see their own purchases

### Atomic Transactions
The `atomic_add_credits()` database function ensures:
- Row-level locking to prevent race conditions
- Idempotency protection against duplicate webhooks
- All operations (balance update, ledger insert, idempotency tracking) in single transaction
- Automatic rollback on any error

### Idempotency
- Each payment has unique idempotency key: `crypto_purchase_{payment_id}`
- Duplicate webhooks (common with NOWPayments) are safely ignored
- No risk of double-crediting users

## Testing

### Sandbox Testing
1. Use NOWPayments sandbox environment for testing
2. Update API keys to sandbox keys
3. Test the complete flow without real funds

### What to Test:
- Invoice creation
- Payment completion
- Webhook reception and validation
- Credit addition
- Duplicate webhook handling (idempotency)

## Webhook URL

Make sure to configure your webhook URL in NOWPayments dashboard:
```
https://your-domain.com/api/crypto/ipn
```

The URL is automatically included in invoice creation, but NOWPayments may require manual configuration in their dashboard as well.

## Monitoring

Check your Supabase logs for:
- `[IPN]` - Webhook processing logs
- `[Security]` - Credit transaction logs

All operations are logged for audit purposes.

## Troubleshooting

### Credits Not Added After Payment
1. Check Supabase logs for IPN webhook errors
2. Verify IPN secret is correct in Replit Secrets
3. Check `crypto_purchases` table for payment status
4. Ensure webhook URL is accessible from NOWPayments servers

### Webhook Signature Validation Failed
- Verify `NOWPAYMENTS_IPN_SECRET` matches the one in NOWPayments dashboard
- Check that the secret hasn't been rotated

### Payment Recorded But Credits Not Added
- Check `idempotency_keys` table for duplicate entries
- Look for errors in `credit_ledger` table
- Verify user exists in `users` table

## Files Created/Modified

- `app/api/crypto/create-invoice/route.ts` - Invoice creation endpoint
- `app/api/crypto/ipn/route.ts` - Webhook handler
- `app/buy-credits/page.tsx` - Credit packages page
- `lib/credits/transactions.ts` - Atomic credit addition function
- `database/migrations/add-crypto-purchases.sql` - Database migration
- `components/header.tsx` - Added "Buy Credits" menu link
