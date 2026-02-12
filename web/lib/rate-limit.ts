import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Upstash Redis가 설정되지 않은 경우 fallback (로컬 개발용)
const isUpstashConfigured =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN

let ratelimit: Ratelimit | null = null

if (isUpstashConfigured) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(20, '1 h'), // 1시간에 20회
    analytics: true,
    prefix: 'jiwonham:ai',
  })
}

// 인메모리 fallback (로컬 개발 / Upstash 미설정 시)
const localStore = new Map<string, { count: number; resetAt: number }>()
const LOCAL_LIMIT = 20
const WINDOW_MS = 60 * 60 * 1000

function localRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = localStore.get(userId)
  if (!record || now > record.resetAt) {
    localStore.set(userId, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: LOCAL_LIMIT - 1 }
  }
  if (record.count >= LOCAL_LIMIT) return { allowed: false, remaining: 0 }
  record.count++
  return { allowed: true, remaining: LOCAL_LIMIT - record.count }
}

export async function checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  if (!ratelimit) {
    return localRateLimit(userId)
  }
  const { success, remaining } = await ratelimit.limit(userId)
  return { allowed: success, remaining: remaining ?? 0 }
}
