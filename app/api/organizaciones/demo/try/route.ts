import { Redis } from '@upstash/redis'

/**
 * Anonymous counter for the landing "Pruébelo" widget. Stores nothing but a
 * single integer: no answer, no IP, no cookie. No-op without Upstash.
 */
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null

export async function POST() {
  try {
    if (redis) await redis.incr('org:landing:try_it_count')
  } catch {
    // Counter is best-effort.
  }
  return new Response(null, { status: 204 })
}
