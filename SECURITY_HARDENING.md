# Security Hardening Implementation

## Overview

This document outlines the comprehensive security hardening implemented for the credit system, following industry best practices for payment and transaction security.

## Core Security Principles

1. **Server-Only Credit Operations**: All credit checks and deductions occur server-side only
2. **Atomic Transactions**: Credit deductions, ledger entries, and job creation happen in a single database transaction
3. **Immutable Audit Trail**: Credit ledger is append-only with no updates or deletes allowed
4. **Request Validation**: All inputs are validated with strict schemas before processing
5. **Rate Limiting**: Per-user and per-IP throttling prevents abuse
6. **Model Whitelist**: Only registered models can be accessed; no arbitrary endpoints
7. **Automatic Refunds**: Failed generations trigger automatic credit refunds

## Architecture Components

### 1. Request Validation (`lib/validation/schemas.ts`)

All API endpoints validate requests using Zod schemas:

- **Dimension Limits**: Width/height restricted to [512, 768, 1024, 1280, 1536, 2048]
- **Total Pixel Cap**: Maximum 2048x2048 (4.2M pixels)
- **Prompt Limits**: Max 2000 characters
- **Steps Limit**: Max 50 inference steps
- **Guidance Scale**: 1-20 range

```typescript
import { imageGenerationSchema } from '@/lib/validation/schemas'

const validation = imageGenerationSchema.safeParse(body)
if (!validation.success) {
  return NextResponse.json({ error: validation.error }, { status: 400 })
}
```

### 2. Atomic Credit Transactions (`lib/credits/transactions.ts`)

The `atomicCreditCharge` function performs all operations in a single database transaction:

```sql
BEGIN TRANSACTION
  1. Lock user row
  2. Check balance >= cost
  3. Update user credits
  4. Create generation job
  5. Insert immutable ledger entry
  6. Create idempotency key
COMMIT
```

On failure, everything rolls back automatically.

### 3. Rate Limiting (`lib/security/rate-limit.ts`)

Two-tier rate limiting:
- **Per-IP**: 20 requests/minute (prevents spam from single source)
- **Per-User**: 10 requests/minute (prevents abuse from authenticated users)

Returns `429 Too Many Requests` with `Retry-After` header when exceeded.

### 4. Model Validation (`lib/security/model-validator.ts`)

Strict whitelist enforcement:
- Only models in `MODEL_REGISTRY` are allowed
- Server computes pricing from registry (client cannot tamper)
- Invalid model IDs are rejected before any credit operations

### 5. Automatic Refunds

When generation fails:
```typescript
const result = await defaultAIClient.generate(...)
if (!result.success) {
  await refundFailedJob(jobId, result.error)
  return NextResponse.json({ error: result.error }, { status: 500 })
}
```

This ensures users are never charged for failed generations.

## Database Security

### Immutable Credit Ledger

```sql
-- Prevent updates
CREATE RULE credit_ledger_no_update AS 
  ON UPDATE TO credit_ledger 
  DO INSTEAD NOTHING;

-- Prevent deletes
CREATE RULE credit_ledger_no_delete AS 
  ON DELETE TO credit_ledger 
  DO INSTEAD NOTHING;
```

### Row Level Security

- Users can only view their own jobs and ledger entries
- Only service role can insert/update jobs and ledger
- Balance column has non-negative constraint

### Atomic Functions

**`atomic_charge_credits()`**:
- Locks user row with `FOR UPDATE`
- Validates sufficient balance
- Updates credits, creates job, inserts ledger in single transaction
- Returns job ID and new balance

**`refund_credits()`**:
- Locks user row
- Adds credits back
- Records refund in ledger
- Marks job as failed

## Observability

### Provider Logging (`lib/observability/logger.ts`)

Tracks every AI provider request:
- Request ID and user ID
- Provider and model used
- Status code and latency
- Success/failure status
- Error messages

```typescript
import { logProviderRequest } from '@/lib/observability/logger'

logProviderRequest({
  requestId,
  userId,
  provider: 'wavespeed',
  modelId: 'flux-dev',
  statusCode: 200,
  latencyMs: 3500,
  success: true,
})
```

### Reconciliation (`lib/observability/reconciliation.ts`)

Daily reconciliation tools:

**`reconcileCreditLedger()`**: Verifies user balances match ledger sums
**`getGenerationStats()`**: Reports on job success rates and costs
**`detectAnomalies()`**: Flags suspicious activity patterns

## Deployment Steps

### 1. Run Database Migration

Execute the atomic credit system migration:

```bash
psql $DATABASE_URL -f database/migrations/atomic-credit-system.sql
```

This creates:
- `generation_jobs` table
- Atomic credit functions
- Immutable ledger rules
- RLS policies

### 2. Environment Variables

Ensure these are set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- All provider API keys

### 3. Deploy Application

```bash
npm run build
npm run deploy
```

### 4. Verify Security

Run post-deployment checks:

```typescript
// Check reconciliation
const report = await reconcileCreditLedger()
console.log('Discrepancies:', report.summary)

// Check generation stats
const stats = await getGenerationStats(24)
console.log('24h Stats:', stats)

// Check for anomalies
const anomalies = await detectAnomalies()
console.log('Suspicious Activity:', anomalies.suspiciousActivity)
```

## API Changes

### Before (Insecure)
```typescript
// No validation
const { prompt, width, height } = await request.json()

// Race condition: check → charge in separate operations
const balance = await getUserCredits(userId)
if (balance < cost) return error
await chargeCredits(userId, cost)

// No refund on failure
const result = await generateImage()
return NextResponse.json({ url: result.url })
```

### After (Secure)
```typescript
// Strict validation
const validation = imageGenerationSchema.safeParse(body)
if (!validation.success) return error

// Rate limiting
const rateLimitResponse = await rateLimitMiddleware(request, userId)
if (rateLimitResponse) return rateLimitResponse

// Model whitelist
const modelValidation = validateModelId(modelId)
if (!modelValidation.valid) return error

// Atomic charge
const charge = await atomicCreditCharge(userId, 'image', idempotencyKey)
if (!charge.success) return error

// Auto-refund on failure
const result = await defaultAIClient.generate(...)
if (!result.success) {
  await refundFailedJob(charge.jobId, result.error)
  return error
}

await completeGenerationJob(charge.jobId, true, result.mediaUrl)
return NextResponse.json({ url: result.mediaUrl })
```

## Security Checklist

- [x] All credit operations use atomic transactions
- [x] Request validation with strict schemas
- [x] Rate limiting (per-IP and per-user)
- [x] Model whitelist enforcement
- [x] Automatic refunds on generation failure
- [x] Immutable credit ledger (append-only)
- [x] Row Level Security on all tables
- [x] Idempotency protection
- [x] Provider request logging
- [x] Reconciliation utilities
- [x] Anomaly detection

## Monitoring & Alerts

Set up monitoring for:

1. **High Discrepancy Rate**: Alert if `reconcileCreditLedger()` finds >1% discrepancies
2. **Low Success Rate**: Alert if generation success rate <90%
3. **Anomalous Activity**: Alert on `detectAnomalies()` findings
4. **Rate Limit Hits**: Monitor 429 responses for attack patterns

## Testing

Run security tests:

```bash
# Test rate limiting
for i in {1..25}; do curl /api/generate; done
# Should return 429 after 10 requests

# Test invalid dimensions
curl -X POST /api/generate -d '{"width": 3000}'
# Should return 400

# Test invalid model
curl -X POST /api/generate -d '{"model": "fake-model"}'
# Should return 400

# Test atomic rollback
# Disable provider, verify credits are refunded
```

## Future Enhancements

1. **Distributed Rate Limiting**: Use Redis for multi-instance rate limiting
2. **ML-Based Anomaly Detection**: Train models on usage patterns
3. **Real-Time Dashboards**: Grafana dashboards for observability
4. **Automated Reconciliation**: Scheduled jobs with Slack alerts
5. **Circuit Breakers**: Auto-disable failing providers
