# Production Deployment Guide

## Overview

This guide covers the complete deployment process for your AI image/video generation application on Replit, including all required secrets, database setup, and production configurations.

---

## Prerequisites

Before deploying, ensure you have:

1. **Replit Account** - Your app is already hosted here
2. **Supabase Account** - For authentication and PostgreSQL database
3. **Vercel Blob Account** - For media storage
4. **AI Provider API Keys**:
   - Wavespeed API token(s)
   - HuggingFace API token(s)
   - (Optional) FAL.ai API key for premium video

---

## Step 1: Environment Variables Setup

### Required Secrets in Replit

Go to your Replit project → **Secrets** tab and add the following:

#### **Authentication & Database (Supabase)**
```bash
# Your Supabase project URL (format: https://xxx.supabase.co)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase anonymous/public key (safe to expose to frontend)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Supabase service role key (KEEP SECRET - full database access)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Where to find these:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy `URL`, `anon/public key`, and `service_role key`

#### **Media Storage (Vercel Blob)**
```bash
# Vercel Blob storage token with read/write permissions
BLOB_READ_WRITE_TOKEN=your_blob_token_here
```

**Where to get this:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (or create one)
3. Navigate to **Storage** → **Blob**
4. Create or copy your `Read/Write Token`

#### **AI Provider Keys**

**Wavespeed (Image Generation & Editing)**
```bash
# Primary Wavespeed API token
WAVESPEED_API_TOKEN=your_wavespeed_token_here

# Optional: Additional tokens for load balancing
WAVESPEED_API_TOKEN_2=your_wavespeed_token_2
WAVESPEED_API_TOKEN_3=your_wavespeed_token_3
```

**HuggingFace (Alternative Image & Video)**
```bash
# Primary HuggingFace API token
HUGGINGFACE_API_TOKEN=your_hf_token_here

# Optional: Additional tokens for rate limit distribution
HUGGINGFACE_API_TOKEN_2=your_hf_token_2
HUGGINGFACE_API_TOKEN_3=your_hf_token_3
```

**Where to get HuggingFace tokens:**
1. Go to [HuggingFace Settings](https://huggingface.co/settings/tokens)
2. Click **New token**
3. Select **Read** permission
4. Copy the token

**Note:** Multiple tokens help distribute rate limits across providers. You need at least one token per provider you're using.

---

## Step 2: Database Setup (Supabase)

### 2.1 Apply Security Migration

The app uses atomic credit transactions and database-backed rate limiting. Apply these migrations:

1. **Go to Supabase SQL Editor:**
   - Open [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project → **SQL Editor**

2. **Run Migration Files in Order:**

   **First: Atomic Credit System**
   ```bash
   # Copy contents of database/migrations/atomic-credit-system.sql
   # Paste into SQL Editor and run
   ```

   **Second: Rate Limiting System**
   ```bash
   # Copy contents of database/migrations/add-rate-limiting.sql
   # Paste into SQL Editor and run
   ```

3. **Verify Migrations:**
   ```sql
   -- Check if new functions exist
   SELECT proname FROM pg_proc 
   WHERE proname IN ('atomic_charge_credits', 'refund_credits', 'check_rate_limit');

   -- Check if new tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_name IN ('generation_jobs', 'rate_limits');
   ```

   You should see all 3 functions and 2 tables listed.

### 2.2 Configure Google OAuth (Supabase)

1. **Go to Supabase Authentication:**
   - Dashboard → **Authentication** → **Providers**

2. **Enable Google Provider:**
   - Toggle **Google** to enabled
   - You can use Supabase's OAuth or configure your own Google OAuth client

3. **Update Redirect URLs:**
   - Go to **Authentication** → **URL Configuration**
   - Add your Replit domain to **Redirect URLs**:
     ```
     https://your-replit-app.replit.dev/auth/callback
     ```
   - Set **Site URL** to:
     ```
     https://your-replit-app.replit.dev
     ```

### 2.3 Database Policies (Row Level Security)

Ensure RLS policies are active:

```sql
-- Users can only see their own data
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE edited_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies (if not exist)
CREATE POLICY "Users can view own images" ON images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own videos" ON videos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own edits" ON edited_images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own ledger" ON credit_ledger
  FOR SELECT USING (auth.uid() = user_id);
```

---

## Step 3: Rate Limiting Setup

The app now uses **database-backed rate limiting** (production-ready):

**Current Limits:**
- **Per User:** 10 requests/minute
- **Per IP:** 20 requests/minute

**To adjust limits**, edit `lib/security/rate-limit-db.ts`:
```typescript
const DEFAULT_USER_LIMIT: RateLimitConfig = {
  windowSeconds: 60,
  maxRequests: 10, // Adjust this
}

const DEFAULT_IP_LIMIT: RateLimitConfig = {
  windowSeconds: 60,
  maxRequests: 20, // Adjust this
}
```

**Cleanup Expired Entries:**

Set up a periodic cleanup (recommended: daily via cron):

```typescript
// In a cron job or scheduled task
import { cleanupExpiredRateLimits } from '@/lib/security/rate-limit-db'

const deleted = await cleanupExpiredRateLimits()
console.log(`Cleaned up ${deleted} expired rate limit entries`)
```

---

## Step 4: Credit System Configuration

### Default Credit Costs

Defined in `lib/ai-client/model-registry.ts`:

- **Image Generation:** 500 credits
- **Image Editing:** 1,000 credits
- **Video (3s):** 2,000 credits
- **Video (5s):** 3,000 credits

### New User Bonus

New users automatically receive **3,000 credits** on signup (via database trigger).

### Monitoring Credits

Use the observability tools:

```typescript
// Check for credit discrepancies
import { reconcileCreditLedger } from '@/lib/observability/reconciliation'

const report = await reconcileCreditLedger()
if (report.summary.discrepancyRate > 0.01) {
  console.error('Credit discrepancies detected:', report.summary)
}

// Get generation statistics
import { getGenerationStats } from '@/lib/observability/reconciliation'

const stats = await getGenerationStats(24) // Last 24 hours
console.log('Success rate:', stats.completedJobs / stats.totalJobs)
```

---

## Step 5: Deployment Configuration

### Development Mode (Current)

The app runs on port 5000 with hot reload:

```bash
pnpm run dev
```

### Production Deployment

Replit supports **Autoscale** deployments. The configuration is already set up in the deployment settings.

**To deploy:**
1. Click **Deploy** button in Replit
2. Choose **Autoscale** (recommended)
3. Your app will be available at: `https://your-replit-app.replit.app`

**Production Build Command:**
```bash
pnpm run build
pnpm run start
```

---

## Step 6: Post-Deployment Checklist

After deployment, verify these are working:

### ✅ Authentication
- [ ] Google OAuth login works
- [ ] Users receive 3,000 credits on signup
- [ ] Session persists across page refreshes

### ✅ Generation Features
- [ ] Image generation (all 3 sizes: Portrait, Square, Landscape)
- [ ] Image editing
- [ ] Video generation (all styles)
- [ ] Credit costs display correctly

### ✅ Security
- [ ] Rate limiting triggers at 10 req/min (user) and 20 req/min (IP)
- [ ] Invalid dimensions are rejected with friendly errors
- [ ] Unauthorized requests return clear messages

### ✅ Database
- [ ] `generation_jobs` table exists
- [ ] `rate_limits` table exists
- [ ] Atomic credit functions work
- [ ] Credits refund automatically on failures

### ✅ Monitoring
- [ ] Check logs for errors: `/tmp/logs/`
- [ ] Run credit reconciliation (should show 0 discrepancies)
- [ ] Verify generation success rate > 90%

---

## Step 7: Monitoring & Maintenance

### Log Files

Logs are stored in `/tmp/logs/`:
- `Server_*.log` - Server workflow logs
- `browser_console_*.log` - Frontend console logs

**View logs:**
```bash
# Latest server logs
cat /tmp/logs/Server_*.log | tail -100

# Search for errors
grep -i error /tmp/logs/Server_*.log
```

### Database Maintenance

**Weekly Tasks:**
1. Run credit reconciliation to check for discrepancies
2. Clean up expired rate limit entries
3. Review generation statistics

**Monthly Tasks:**
1. Archive old temporary media (older than 30 days)
2. Review user credit balances for anomalies
3. Check provider response times and adjust timeouts if needed

### Performance Optimization

**If experiencing slowdowns:**

1. **Check rate limits** - May need to increase for high traffic
2. **Review provider timeouts** - Adjust in `lib/ai-client/model-registry.ts`
3. **Database indexes** - Ensure all foreign keys have indexes
4. **Media storage** - Archive old temporary files

---

## Troubleshooting

### Common Issues

#### **Issue: Google Auth Not Working**
**Solution:**
1. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct (should be https format)
2. Check redirect URL in Supabase matches your domain exactly
3. Ensure Site URL is set in Supabase Authentication settings

#### **Issue: Rate Limiting Not Working**
**Solution:**
1. Verify `rate_limits` table exists: `SELECT * FROM rate_limits LIMIT 1;`
2. Check `check_rate_limit` function exists in database
3. Review logs for rate limit errors

#### **Issue: Credits Not Deducting**
**Solution:**
1. Verify `generation_jobs` table exists
2. Check if `atomic_charge_credits` function works:
   ```sql
   SELECT atomic_charge_credits(
     'test-user-id'::uuid, 
     'image'::text, 
     500, 
     'Test charge'::text, 
     '{}'::jsonb, 
     null::uuid
   );
   ```
3. Review credit ledger for transaction records

#### **Issue: Images/Videos Not Generating**
**Solution:**
1. Check API keys are valid in Secrets
2. Review provider logs: `SELECT * FROM provider_logs ORDER BY created_at DESC LIMIT 10;`
3. Verify model endpoints in `lib/ai-client/model-registry.ts`
4. Check if app is enabled: `SELECT * FROM app_settings WHERE setting_key = 'app_enabled';`

---

## Security Best Practices

1. **Never commit secrets** - Always use Replit Secrets
2. **Rotate API keys** - Change provider keys every 90 days
3. **Monitor rate limits** - Set up alerts for unusual activity
4. **Regular backups** - Backup Supabase database weekly
5. **Review permissions** - Audit database policies monthly

---

## Support & Documentation

- **Replit Docs:** https://docs.replit.com
- **Supabase Docs:** https://supabase.com/docs
- **Vercel Blob Docs:** https://vercel.com/docs/storage/vercel-blob

For application-specific architecture, see:
- `replit.md` - Project overview and architecture
- `SECURITY_HARDENING.md` - Security implementation details
- `DEPLOYMENT_GUIDE.md` - Database migration guide

---

## Quick Reference

### Essential Commands

```bash
# Start development server
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm run start

# Run credit reconciliation
node -e "import('@/lib/observability/reconciliation').then(m => m.reconcileCreditLedger().then(console.log))"

# Clean up rate limits
node -e "import('@/lib/security/rate-limit-db').then(m => m.cleanupExpiredRateLimits().then(console.log))"
```

### Important URLs

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Vercel Dashboard:** https://vercel.com/dashboard  
- **HuggingFace Tokens:** https://huggingface.co/settings/tokens
- **Wavespeed Docs:** (contact provider for documentation)

---

## Conclusion

Your AI generation app is now production-ready with:

✅ Database-backed rate limiting (scales across instances)
✅ Atomic credit transactions (no race conditions)
✅ User-friendly error messages
✅ Automatic credit refunds on failures
✅ Comprehensive monitoring and observability

Deploy with confidence! 🚀
