interface ProviderLog {
  requestId: string
  userId: string
  provider: string
  modelId: string
  operation: string
  statusCode?: number
  latencyMs: number
  success: boolean
  error?: string
  timestamp: string
}

interface CreditAuditEntry {
  userId: string
  operation: string
  cost: number
  balanceBefore: number
  balanceAfter: number
  jobId: string
  success: boolean
  timestamp: string
}

const providerLogs: ProviderLog[] = []
const creditAudits: CreditAuditEntry[] = []

const MAX_LOGS = 1000

export function logProviderRequest(log: ProviderLog): void {
  providerLogs.push({
    ...log,
    timestamp: new Date().toISOString(),
  })

  if (providerLogs.length > MAX_LOGS) {
    providerLogs.shift()
  }

  console.log('[Observability] Provider request:', {
    provider: log.provider,
    modelId: log.modelId,
    success: log.success,
    latencyMs: log.latencyMs,
    statusCode: log.statusCode,
  })
}

export function logCreditTransaction(audit: CreditAuditEntry): void {
  creditAudits.push({
    ...audit,
    timestamp: new Date().toISOString(),
  })

  if (creditAudits.length > MAX_LOGS) {
    creditAudits.shift()
  }

  console.log('[Observability] Credit transaction:', {
    userId: audit.userId,
    operation: audit.operation,
    cost: audit.cost,
    balanceAfter: audit.balanceAfter,
    success: audit.success,
  })
}

export function getProviderLogs(filters?: {
  provider?: string
  modelId?: string
  userId?: string
  sinceMinutes?: number
}): ProviderLog[] {
  let filtered = providerLogs

  if (filters) {
    if (filters.provider) {
      filtered = filtered.filter(log => log.provider === filters.provider)
    }
    if (filters.modelId) {
      filtered = filtered.filter(log => log.modelId === filters.modelId)
    }
    if (filters.userId) {
      filtered = filtered.filter(log => log.userId === filters.userId)
    }
    if (filters.sinceMinutes) {
      const cutoff = new Date(Date.now() - filters.sinceMinutes * 60 * 1000).toISOString()
      filtered = filtered.filter(log => log.timestamp > cutoff)
    }
  }

  return filtered
}

export function getCreditAudits(filters?: {
  userId?: string
  sinceMinutes?: number
}): CreditAuditEntry[] {
  let filtered = creditAudits

  if (filters) {
    if (filters.userId) {
      filtered = filtered.filter(audit => audit.userId === filters.userId)
    }
    if (filters.sinceMinutes) {
      const cutoff = new Date(Date.now() - filters.sinceMinutes * 60 * 1000).toISOString()
      filtered = filtered.filter(audit => audit.timestamp > cutoff)
    }
  }

  return filtered
}

export function getProviderStats(sinceMinutes = 60) {
  const logs = getProviderLogs({ sinceMinutes })
  
  const stats = {
    totalRequests: logs.length,
    successCount: logs.filter(log => log.success).length,
    failureCount: logs.filter(log => !log.success).length,
    avgLatencyMs: logs.reduce((sum, log) => sum + log.latencyMs, 0) / (logs.length || 1),
    byProvider: {} as Record<string, {
      count: number
      successRate: number
      avgLatency: number
    }>,
  }

  const providerGroups = logs.reduce((acc, log) => {
    if (!acc[log.provider]) {
      acc[log.provider] = []
    }
    acc[log.provider].push(log)
    return acc
  }, {} as Record<string, ProviderLog[]>)

  for (const [provider, providerLogs] of Object.entries(providerGroups)) {
    const successes = providerLogs.filter(log => log.success).length
    stats.byProvider[provider] = {
      count: providerLogs.length,
      successRate: successes / providerLogs.length,
      avgLatency: providerLogs.reduce((sum, log) => sum + log.latencyMs, 0) / providerLogs.length,
    }
  }

  return stats
}
