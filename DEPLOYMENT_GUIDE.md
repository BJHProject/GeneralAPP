# Security System Deployment Guide

## Prerequisites

Before deploying the security-hardened credit system, ensure:

1. **Database Access**: You have admin access to your Supabase PostgreSQL database
2. **Environment Variables**: All required secrets are configured in Replit
3. **Backup**: Database is backed up (recommended before schema changes)

## Deployment Steps

### Step 1: Apply Database Migration

The atomic credit system requires new database functions and tables. Apply the migration:

**Option A: Via Supabase Dashboard (Recommended)**
1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `database/migrations/atomic-credit-system.sql`
3. Paste and run in SQL Editor
4. Verify no errors in the output

**Option B: Via Command Line**
```bash
# If you have psql access
psql $DATABASE_URL -f database/migrations/atomic-credit-system.sql
```

### Step 2: Verify Migration

After running the migration, verify these were created:

**New Table:**
- `generation_jobs` - Tracks all generation jobs with status

**New Functions:**
- `atomic_charge_credits()` - Atomically charges credits and creates jobs
- `refund_credits()` - Refunds credits for failed generations

**Modified Table:**
- `credit_ledger` - Now has NOT NULL constraint on `delta` and immutable rules

**Run verification query:**
```sql
-- Check if functions exist
SELECT proname FROM pg_proc WHERE proname IN ('atomic_charge_credits', 'refund_credits');

-- Check if generation_jobs table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'generation_jobs';

-- Check credit_ledger has delta NOT NULL
SELECT column_name, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'credit_ledger' AND column_name = 'delta';
```

### Step 3: Test Security Features

After deployment, test the following:

**1. Rate Limiting**
```bash
# Should get 429 after 10 requests
for i in {1..15}; do 
  curl -X POST https://your-app.replit.app/api/generate \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"prompt":"test"}'
done
```

**2. Input Validation**
```bash
# Should reject invalid dimensions
curl -X POST https://your-app.replit.app/api/generate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"prompt":"test","width":5000,"height":5000}'
# Expected: 400 error

# Should reject invalid model
curl -X POST https://your-app.replit.app/api/generate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"prompt":"test","model":"fake-model"}'
# Expected: 400 error
```

**3. Atomic Transactions**
```bash
# Test insufficient credits scenario
# 1. Set user credits to 100 (less than image cost of 500)
# 2. Try to generate image
# Expected: 402 error, credits unchanged
```

**4. Automatic Refunds**
```bash
# Temporarily disable a provider or use invalid API key
# Generate image
# Expected: Credits automatically refunded
```

### Step 4: Monitor Observability

Use the built-in reconciliation tools to monitor system health:

**Check for discrepancies:**
```typescript
import { reconcileCreditLedger } from '@/lib/observability/reconciliation'

const report = await reconcileCreditLedger()
console.log('Discrepancies:', report.summary)
// Should show 0 discrepancies in healthy system
```

**Check generation stats:**
```typescript
import { getGenerationStats } from '@/lib/observability/reconciliation'

const stats = await getGenerationStats(24) // Last 24 hours
console.log('Success Rate:', stats.completedJobs / stats.totalJobs)
// Should be >90% in healthy system
```

**Detect anomalies:**
```typescript
import { detectAnomalies } from '@/lib/observability/reconciliation'

const anomalies = await detectAnomalies()
console.log('Suspicious Activity:', anomalies.suspiciousActivity)
// Should be empty array in normal operation
```

## Post-Deployment Checklist

- [ ] Database migration applied successfully
- [ ] `generation_jobs` table exists
- [ ] `atomic_charge_credits()` function exists
- [ ] `refund_credits()` function exists
- [ ] `credit_ledger` has NOT NULL constraint on `delta`
- [ ] Rate limiting returns 429 after threshold
- [ ] Invalid dimensions are rejected (400 error)
- [ ] Invalid models are rejected (400 error)
- [ ] Insufficient credits return 402 error
- [ ] Failed generations trigger automatic refunds
- [ ] Reconciliation reports 0 discrepancies
- [ ] Generation success rate >90%

## Rollback Plan

If issues arise, you can rollback the migration:

```sql
-- Drop new functions
DROP FUNCTION IF EXISTS atomic_charge_credits CASCADE;
DROP FUNCTION IF EXISTS refund_credits CASCADE;

-- Drop new table
DROP TABLE IF EXISTS generation_jobs CASCADE;

-- Remove ledger constraints (optional, if causing issues)
DROP RULE IF EXISTS credit_ledger_no_update ON credit_ledger;
DROP RULE IF EXISTS credit_ledger_no_delete ON credit_ledger;
```

Then redeploy the previous version of the application code.

## Monitoring & Alerts

Set up monitoring for:

1. **Discrepancy Rate**: Run `reconcileCreditLedger()` daily
   - Alert if >1% discrepancies found
   
2. **Success Rate**: Monitor generation stats
   - Alert if success rate <90%
   
3. **Rate Limit Hits**: Track 429 responses
   - Alert if spike indicates attack
   
4. **Anomalies**: Run `detectAnomalies()` hourly
   - Alert on suspicious activity

## Support

For issues or questions:
- Check `SECURITY_HARDENING.md` for detailed architecture
- Review logs in `/tmp/logs/` for errors
- Run reconciliation tools to diagnose discrepancies

## Future Enhancements

Consider these improvements for production scale:

1. **Redis-backed rate limiting** - For multi-instance deployments
2. **Automated testing** - CI/CD tests for security features
3. **External log persistence** - Store observability data in database
4. **Real-time dashboards** - Grafana for monitoring
5. **Automated reconciliation** - Scheduled jobs with alerts
