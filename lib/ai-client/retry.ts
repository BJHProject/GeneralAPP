import { RetryConfig } from './types'

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  initialDelay: 5000,
  maxDelay: 5000,
  backoffMultiplier: 1,
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  shouldRetry: (error: any) => boolean = () => true,
): Promise<T> {
  const { maxRetries, initialDelay, maxDelay, backoffMultiplier } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  }

  let lastError: any
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error
      }

      console.log(`[retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
      await sleep(delay)

      delay = Math.min(delay * backoffMultiplier, maxDelay)
    }
  }

  throw lastError
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isRetryableError(error: any): boolean {
  if (!error) return false

  const statusCode = error.status || error.statusCode || error.code
  
  if (typeof statusCode === 'number') {
    return statusCode >= 500 || statusCode === 429 || statusCode === 408
  }

  if (typeof statusCode === 'string') {
    return statusCode.startsWith('5') || statusCode === '429' || statusCode === '408'
  }

  const message = error.message || String(error)
  const retryablePatterns = [
    /timeout/i,
    /network/i,
    /ECONNREFUSED/i,
    /ENOTFOUND/i,
    /ETIMEDOUT/i,
    /rate limit/i,
    /quota/i,
    /too many requests/i,
    /loading/i,
    /warming/i,
    /initializing/i,
    /starting/i,
    /model.*loading/i,
    /lora.*loading/i,
  ]

  return retryablePatterns.some(pattern => pattern.test(message))
}
