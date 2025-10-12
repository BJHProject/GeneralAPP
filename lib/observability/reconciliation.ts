import { createServiceRoleClient } from "@/lib/supabase/service-role"

export interface ReconciliationReport {
  timestamp: string
  totalUsers: number
  discrepancies: Array<{
    userId: string
    currentBalance: number
    ledgerBalance: number
    difference: number
  }>
  summary: {
    totalDiscrepancies: number
    totalDifference: number
    affectedUsers: number
  }
}

export async function reconcileCreditLedger(): Promise<ReconciliationReport> {
  const supabase = createServiceRoleClient()
  
  console.log('[Reconciliation] Starting credit ledger reconciliation...')

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, credits')

  if (usersError || !users) {
    throw new Error(`Failed to fetch users: ${usersError?.message}`)
  }

  const discrepancies: ReconciliationReport['discrepancies'] = []
  let totalDifference = 0

  for (const user of users) {
    const { data: ledgerEntries, error: ledgerError } = await supabase
      .from('credit_ledger')
      .select('delta')
      .eq('user_id', user.id)

    if (ledgerError) {
      console.error(`[Reconciliation] Error fetching ledger for user ${user.id}:`, ledgerError)
      continue
    }

    const ledgerBalance = ledgerEntries?.reduce((sum, entry) => sum + (entry.delta || 0), 0) || 0
    
    const difference = user.credits - ledgerBalance
    
    if (Math.abs(difference) > 0) {
      discrepancies.push({
        userId: user.id,
        currentBalance: user.credits,
        ledgerBalance,
        difference,
      })
      totalDifference += Math.abs(difference)
    }
  }

  const report: ReconciliationReport = {
    timestamp: new Date().toISOString(),
    totalUsers: users.length,
    discrepancies,
    summary: {
      totalDiscrepancies: discrepancies.length,
      totalDifference,
      affectedUsers: discrepancies.length,
    },
  }

  console.log('[Reconciliation] Complete:', report.summary)

  if (discrepancies.length > 0) {
    console.warn('[Reconciliation] ⚠️  Found discrepancies:', discrepancies.slice(0, 5))
  }

  return report
}

export interface GenerationStats {
  totalJobs: number
  completedJobs: number
  failedJobs: number
  pendingJobs: number
  totalCreditsSpent: number
  totalCreditsRefunded: number
  byOperation: Record<string, {
    count: number
    successRate: number
    avgCost: number
  }>
}

export async function getGenerationStats(sinceHours = 24): Promise<GenerationStats> {
  const supabase = createServiceRoleClient()
  
  const cutoff = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString()

  const { data: jobs, error } = await supabase
    .from('generation_jobs')
    .select('*')
    .gte('created_at', cutoff)

  if (error || !jobs) {
    throw new Error(`Failed to fetch jobs: ${error?.message}`)
  }

  const stats: GenerationStats = {
    totalJobs: jobs.length,
    completedJobs: jobs.filter(j => j.status === 'completed').length,
    failedJobs: jobs.filter(j => j.status === 'failed').length,
    pendingJobs: jobs.filter(j => j.status === 'pending').length,
    totalCreditsSpent: jobs.reduce((sum, j) => sum + j.cost, 0),
    totalCreditsRefunded: 0,
    byOperation: {},
  }

  const { data: refunds } = await supabase
    .from('credit_ledger')
    .select('delta')
    .eq('operation_type', 'refund')
    .gte('created_at', cutoff)

  stats.totalCreditsRefunded = refunds?.reduce((sum, r) => sum + (r.delta || 0), 0) || 0

  const operationGroups = jobs.reduce((acc, job) => {
    if (!acc[job.operation_type]) {
      acc[job.operation_type] = []
    }
    acc[job.operation_type].push(job)
    return acc
  }, {} as Record<string, typeof jobs>)

  for (const [operation, opJobs] of Object.entries(operationGroups)) {
    const completed = opJobs.filter(j => j.status === 'completed').length
    stats.byOperation[operation] = {
      count: opJobs.length,
      successRate: completed / opJobs.length,
      avgCost: opJobs.reduce((sum, j) => sum + j.cost, 0) / opJobs.length,
    }
  }

  return stats
}

export async function detectAnomalies(): Promise<{
  suspiciousActivity: Array<{
    userId: string
    reason: string
    details: any
  }>
}> {
  const supabase = createServiceRoleClient()
  const suspicious: Array<{ userId: string; reason: string; details: any }> = []

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data: recentJobs } = await supabase
    .from('generation_jobs')
    .select('user_id, operation_type, cost, created_at')
    .gte('created_at', oneHourAgo)

  if (recentJobs) {
    const userActivity = recentJobs.reduce((acc, job) => {
      if (!acc[job.user_id]) {
        acc[job.user_id] = { count: 0, totalCost: 0 }
      }
      acc[job.user_id].count++
      acc[job.user_id].totalCost += job.cost
      return acc
    }, {} as Record<string, { count: number; totalCost: number }>)

    for (const [userId, activity] of Object.entries(userActivity)) {
      if (activity.count > 50) {
        suspicious.push({
          userId,
          reason: 'Excessive generation rate',
          details: {
            jobsInLastHour: activity.count,
            totalCostInLastHour: activity.totalCost,
          },
        })
      }

      if (activity.totalCost > 50000) {
        suspicious.push({
          userId,
          reason: 'High credit spending',
          details: {
            creditsSpentInLastHour: activity.totalCost,
          },
        })
      }
    }
  }

  return { suspiciousActivity: suspicious }
}
