import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

interface RateLimitConfig {
  windowSeconds: number
  maxRequests: number
}

interface RateLimitResult {
  allowed: boolean
  currentCount: number
  windowEnd: string
  remaining: number
}

const DEFAULT_USER_LIMIT: RateLimitConfig = {
  windowSeconds: 60, // 1 minute
  maxRequests: 10, // 10 requests per minute per user
}

const DEFAULT_IP_LIMIT: RateLimitConfig = {
  windowSeconds: 60, // 1 minute
  maxRequests: 20, // 20 requests per minute per IP
}

export async function checkDatabaseRateLimit(
  identifier: string,
  type: 'user' | 'ip',
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_identifier: identifier,
    p_type: type,
    p_max_requests: config.maxRequests,
    p_window_seconds: config.windowSeconds,
  })

  if (error) {
    console.error('[Security] Rate limit check failed:', error)
    // Fail open - allow request if DB check fails (but log it)
    return {
      allowed: true,
      currentCount: 0,
      windowEnd: new Date(Date.now() + config.windowSeconds * 1000).toISOString(),
      remaining: config.maxRequests,
    }
  }

  const result = data?.[0]
  return {
    allowed: result?.allowed ?? true,
    currentCount: result?.current_count ?? 0,
    windowEnd: result?.window_end ?? new Date().toISOString(),
    remaining: result?.remaining ?? config.maxRequests,
  }
}

export async function rateLimitMiddleware(
  request: NextRequest,
  userId?: string
): Promise<NextResponse | null> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown'

  // Check IP rate limit
  const ipCheck = await checkDatabaseRateLimit(ip, 'ip', DEFAULT_IP_LIMIT)
  if (!ipCheck.allowed) {
    const retryAfterSeconds = Math.ceil((new Date(ipCheck.windowEnd).getTime() - Date.now()) / 1000)
    console.log('[Security] IP rate limit exceeded:', ip)
    return NextResponse.json(
      { 
        error: 'Too many requests from this IP address. Please try again in a moment.',
        retryAfter: retryAfterSeconds,
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(DEFAULT_IP_LIMIT.maxRequests),
          'X-RateLimit-Remaining': String(ipCheck.remaining),
          'X-RateLimit-Reset': ipCheck.windowEnd,
        },
      }
    )
  }

  // Check user rate limit if authenticated
  if (userId) {
    const userCheck = await checkDatabaseRateLimit(userId, 'user', DEFAULT_USER_LIMIT)
    if (!userCheck.allowed) {
      const retryAfterSeconds = Math.ceil((new Date(userCheck.windowEnd).getTime() - Date.now()) / 1000)
      console.log('[Security] User rate limit exceeded:', userId)
      return NextResponse.json(
        { 
          error: 'You\'re making requests too quickly. Please wait a moment before trying again.',
          retryAfter: retryAfterSeconds,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
            'X-RateLimit-Limit': String(DEFAULT_USER_LIMIT.maxRequests),
            'X-RateLimit-Remaining': String(userCheck.remaining),
            'X-RateLimit-Reset': userCheck.windowEnd,
          },
        }
      )
    }
  }

  return null // Request allowed
}

// Cleanup function to be called periodically (e.g., via cron or background job)
export async function cleanupExpiredRateLimits(): Promise<number> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc('cleanup_expired_rate_limits')

  if (error) {
    console.error('[Security] Failed to cleanup expired rate limits:', error)
    return 0
  }

  return data ?? 0
}
