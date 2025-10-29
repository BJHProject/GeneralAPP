import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { CREDIT_COSTS, CreditOperation } from "@/lib/credits"

export interface GenerationJob {
  id: string
  user_id: string
  operation_type: CreditOperation
  status: 'pending' | 'processing' | 'completed' | 'failed'
  cost: number
  idempotency_key?: string
  metadata?: any
  created_at: string
}

export interface AtomicCreditResult {
  success: boolean
  jobId?: string
  newBalance?: number
  error?: string
  code?: 'INSUFFICIENT_CREDITS' | 'DUPLICATE_REQUEST' | 'DATABASE_ERROR'
}

export async function atomicCreditCharge(
  userId: string,
  operation: CreditOperation,
  idempotencyKey?: string,
  metadata?: any
): Promise<AtomicCreditResult> {
  const supabase = createServiceRoleClient()
  const cost = CREDIT_COSTS[operation]

  console.log('[Security] Starting atomic credit charge:', { userId, operation, cost, idempotencyKey })

  try {
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('idempotency_keys')
        .select('*')
        .eq('key', idempotencyKey)
        .eq('user_id', userId)
        .single()

      if (existing) {
        console.log('[Security] Duplicate request detected:', idempotencyKey)
        return {
          success: false,
          error: 'Request already processed or in progress',
          code: 'DUPLICATE_REQUEST',
        }
      }
    }

    const result = await supabase.rpc('atomic_charge_credits', {
      p_user_id: userId,
      p_operation_type: operation,
      p_cost: cost,
      p_idempotency_key: idempotencyKey || null,
      p_metadata: metadata || {},
    })

    if (result.error) {
      console.error('[Security] Atomic charge failed:', result.error)
      
      if (result.error.message?.includes('insufficient')) {
        return {
          success: false,
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
        }
      }

      return {
        success: false,
        error: result.error.message,
        code: 'DATABASE_ERROR',
      }
    }

    // RPC functions that return TABLE return an array, even with one row
    const jobData = Array.isArray(result.data) ? result.data[0] : result.data

    console.log('[Security] ✓ Atomic credit charge successful:', {
      jobId: jobData?.job_id,
      newBalance: jobData?.new_balance,
    })

    return {
      success: true,
      jobId: jobData?.job_id,
      newBalance: jobData?.new_balance,
    }
  } catch (error: any) {
    console.error('[Security] Exception in atomic charge:', error)
    return {
      success: false,
      error: error.message || 'Failed to charge credits',
      code: 'DATABASE_ERROR',
    }
  }
}

export async function completeGenerationJob(
  jobId: string,
  success: boolean,
  resultUrl?: string,
  errorMessage?: string
): Promise<void> {
  const supabase = createServiceRoleClient()

  console.log('[Security] Completing generation job:', { jobId, success })

  try {
    const { error } = await supabase
      .from('generation_jobs')
      .update({
        status: success ? 'completed' : 'failed',
        result_url: resultUrl || null,
        error_message: errorMessage || null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    if (error) {
      console.error('[Security] Failed to update job:', error)
    }

    if (success && resultUrl) {
      const idempotencyKey = await getJobIdempotencyKey(jobId)
      if (idempotencyKey) {
        await supabase
          .from('idempotency_keys')
          .update({
            status: 'succeeded',
            result: { url: resultUrl },
          })
          .eq('key', idempotencyKey)
      }
    }
  } catch (error) {
    console.error('[Security] Exception completing job:', error)
  }
}

export interface AtomicCreditAddResult {
  success: boolean
  newBalance?: number
  error?: string
  code?: 'DUPLICATE_REQUEST' | 'DATABASE_ERROR'
}

export async function atomicCreditAdd(
  userId: string,
  amount: number,
  operationType: string,
  description: string,
  idempotencyKey?: string,
  metadata?: any
): Promise<AtomicCreditAddResult> {
  const supabase = createServiceRoleClient()

  console.log('[Security] Starting atomic credit addition:', { userId, amount, operationType, idempotencyKey })

  try {
    const result = await supabase.rpc('atomic_add_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_operation_type: operationType,
      p_description: description,
      p_idempotency_key: idempotencyKey || null,
      p_metadata: metadata || {},
    })

    if (result.error) {
      console.error('[Security] Atomic credit addition failed:', result.error)

      if (result.error.message?.includes('already being processed')) {
        return {
          success: false,
          error: 'Request already being processed',
          code: 'DUPLICATE_REQUEST',
        }
      }

      return {
        success: false,
        error: result.error.message,
        code: 'DATABASE_ERROR',
      }
    }

    // RPC functions that return TABLE return an array
    const addData = Array.isArray(result.data) ? result.data[0] : result.data

    // If success is false, it means the idempotency key was already processed
    if (!addData?.success) {
      console.log('[Security] Credits already added (idempotency check)')
      return {
        success: false,
        error: 'Credits already added for this payment',
        code: 'DUPLICATE_REQUEST',
      }
    }

    console.log('[Security] ✓ Atomic credit addition successful:', {
      amount,
      newBalance: addData?.new_balance,
    })

    return {
      success: true,
      newBalance: addData?.new_balance,
    }
  } catch (error: any) {
    console.error('[Security] Exception in atomic credit addition:', error)
    return {
      success: false,
      error: error.message || 'Failed to add credits',
      code: 'DATABASE_ERROR',
    }
  }
}

export async function refundFailedJob(jobId: string, reason: string): Promise<void> {
  const supabase = createServiceRoleClient()

  console.log('[Security] Refunding failed job:', { jobId, reason })

  try {
    const { data: job } = await supabase
      .from('generation_jobs')
      .select('user_id, cost, operation_type')
      .eq('id', jobId)
      .single()

    if (!job) {
      console.error('[Security] Job not found for refund:', jobId)
      return
    }

    await supabase.rpc('refund_credits', {
      p_user_id: job.user_id,
      p_job_id: jobId,
      p_amount: job.cost,
      p_reason: reason,
    })

    const idempotencyKey = await getJobIdempotencyKey(jobId)
    if (idempotencyKey) {
      await supabase
        .from('idempotency_keys')
        .update({ status: 'failed' })
        .eq('key', idempotencyKey)
    }

    console.log('[Security] ✓ Credits refunded:', job.cost)
  } catch (error) {
    console.error('[Security] Exception refunding job:', error)
  }
}

async function getJobIdempotencyKey(jobId: string): Promise<string | null> {
  const supabase = createServiceRoleClient()

  const { data } = await supabase
    .from('generation_jobs')
    .select('idempotency_key')
    .eq('id', jobId)
    .single()

  return data?.idempotency_key || null
}
