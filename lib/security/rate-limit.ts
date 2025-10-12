import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

const userLimits = new Map<string, RateLimitEntry>()
const ipLimits = new Map<string, RateLimitEntry>()

const DEFAULT_USER_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute per user
}

const DEFAULT_IP_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute per IP
}

function cleanupExpiredEntries(store: Map<string, RateLimitEntry>) {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < now) {
      store.delete(key)
    }
  }
}

setInterval(() => {
  cleanupExpiredEntries(userLimits)
  cleanupExpiredEntries(ipLimits)
}, 60000) // Cleanup every minute

export function checkRateLimit(
  identifier: string,
  store: Map<string, RateLimitEntry>,
  config: RateLimitConfig
): { allowed: boolean; resetTime: number; remaining: number } {
  const now = Date.now()
  const entry = store.get(identifier)

  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.windowMs
    store.set(identifier, { count: 1, resetTime })
    return { allowed: true, resetTime, remaining: config.maxRequests - 1 }
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, resetTime: entry.resetTime, remaining: 0 }
  }

  entry.count++
  return { allowed: true, resetTime: entry.resetTime, remaining: config.maxRequests - entry.count }
}

export async function rateLimitMiddleware(
  request: NextRequest,
  userId?: string
): Promise<NextResponse | null> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown'

  const ipCheck = checkRateLimit(ip, ipLimits, DEFAULT_IP_LIMIT)
  if (!ipCheck.allowed) {
    console.log('[Security] IP rate limit exceeded:', ip)
    return NextResponse.json(
      { 
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((ipCheck.resetTime - Date.now()) / 1000),
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((ipCheck.resetTime - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(DEFAULT_IP_LIMIT.maxRequests),
          'X-RateLimit-Remaining': String(ipCheck.remaining),
          'X-RateLimit-Reset': new Date(ipCheck.resetTime).toISOString(),
        },
      }
    )
  }

  if (userId) {
    const userCheck = checkRateLimit(userId, userLimits, DEFAULT_USER_LIMIT)
    if (!userCheck.allowed) {
      console.log('[Security] User rate limit exceeded:', userId)
      return NextResponse.json(
        { 
          error: 'Too many requests. Please slow down.',
          retryAfter: Math.ceil((userCheck.resetTime - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((userCheck.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(DEFAULT_USER_LIMIT.maxRequests),
            'X-RateLimit-Remaining': String(userCheck.remaining),
            'X-RateLimit-Reset': new Date(userCheck.resetTime).toISOString(),
          },
        }
      )
    }
  }

  return null
}
