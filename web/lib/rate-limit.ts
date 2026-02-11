/**
 * 서버리스 환경용 인메모리 Rate Limiter
 * Lambda 인스턴스 내에서 동작하며, 콜드 스타트 시 초기화됨.
 * (소규모 서비스에서 단기 반복 호출 방지에 적합)
 */
const store = new Map<string, { count: number; resetAt: number }>()

export const AI_HOURLY_LIMIT = 20 // 시간당 최대 요청 수
const WINDOW_MS = 60 * 60 * 1000 // 1시간

export function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = store.get(userId)

  if (!record || now > record.resetAt) {
    store.set(userId, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: AI_HOURLY_LIMIT - 1 }
  }

  if (record.count >= AI_HOURLY_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: AI_HOURLY_LIMIT - record.count }
}
