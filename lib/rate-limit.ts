import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Rate Limiting Utility
 * 
 * Uses Upstash Redis for distributed rate limiting across Vercel edge functions.
 * 
 * **Rate Limit Tiers**:
 * - Strict: 5 requests per 60 seconds (auth, payments)
 * - Moderate: 10 requests per 60 seconds (purchases, donations)
 * - Standard: 20 requests per 60 seconds (general API)
 * - Lenient: 50 requests per 60 seconds (read-only endpoints)
 */

// Initialize Redis client (will use environment variables)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

/**
 * Strict rate limiter: 5 requests per 60 seconds
 * Use for: Authentication, payment processing, sensitive operations
 */
export const strictRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '60 s'),
      analytics: true,
      prefix: '@ratelimit/strict',
    })
  : null

/**
 * Moderate rate limiter: 10 requests per 60 seconds
 * Use for: Purchases, donations, treasury operations
 */
export const moderateRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      analytics: true,
      prefix: '@ratelimit/moderate',
    })
  : null

/**
 * Standard rate limiter: 20 requests per 60 seconds
 * Use for: General API endpoints, write operations
 */
export const standardRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '60 s'),
      analytics: true,
      prefix: '@ratelimit/standard',
    })
  : null

/**
 * Lenient rate limiter: 50 requests per 60 seconds
 * Use for: Read-only endpoints, public data
 */
export const lenientRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(50, '60 s'),
      analytics: true,
      prefix: '@ratelimit/lenient',
    })
  : null

/**
 * Señal Express draft limiter: fixed window of 3 requests per day (§7.1).
 * Fixed-window (not sliding) so the cap is a clean "3 drafts per calendar day"
 * per identity. Keyed by user id / guest device id, with an IP backstop — see
 * `getSenalExpressIdentifier`. Only the `draft` endpoint (the LLM call) is
 * rate-limited; `confirm` is cheap PDF rendering.
 */
export const senalExpressDraftRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(3, '1 d'),
      analytics: true,
      prefix: '@ratelimit/senal-express-draft',
    })
  : null

/**
 * Rate-limit identity for Señal Express: prefer the authenticated user id, then
 * the web guest device id (localStorage `cc_guest_id`), and finally the request
 * IP as a backstop when neither is present.
 */
export function getSenalExpressIdentifier(
  request: Request,
  userId?: string | null,
  deviceId?: string | null
): string {
  if (userId) return `user:${userId}`
  if (deviceId && deviceId.trim().length > 0) return `guest:${deviceId.trim()}`
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded
    ? forwarded.split(',')[0]
    : request.headers.get('x-real-ip') || 'unknown'
  return `ip:${ip}`
}

/**
 * Get identifier for rate limiting
 * Uses IP address for anonymous users, user ID for authenticated users
 */
export async function getRateLimitIdentifier(
  request: Request,
  userId?: string | null
): Promise<string> {
  // If user is authenticated, use their user ID
  if (userId) {
    return `user:${userId}`
  }

  // For anonymous users, use IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'

  return `ip:${ip}`
}

/**
 * Check rate limit and return response if exceeded
 * Returns null if allowed, ApiResponse if rate limited
 */
export async function checkRateLimit(
  rateLimiter: Ratelimit | null,
  identifier: string
): Promise<{ allowed: boolean; limit: number; remaining: number; reset: number } | null> {
  // If Redis is not configured, allow all requests (development mode)
  if (!rateLimiter || !redis) {
    console.warn('⚠️ Rate limiting disabled: Redis not configured')
    return { allowed: true, limit: Infinity, remaining: Infinity, reset: Date.now() }
  }

  try {
    const result = await rateLimiter.limit(identifier)
    return {
      allowed: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    // If rate limiting fails, allow the request (fail open)
    console.error('❌ Rate limiting error:', error)
    return { allowed: true, limit: Infinity, remaining: Infinity, reset: Date.now() }
  }
}

/**
 * Rate limit response helper
 */
export function rateLimitResponse(limit: number, remaining: number, reset: number) {
  return Response.json(
    {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Maximum ${limit} requests per minute. Try again after ${new Date(reset).toISOString()}`,
        timestamp: new Date().toISOString(),
      },
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
        'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
      },
    }
  )
}

