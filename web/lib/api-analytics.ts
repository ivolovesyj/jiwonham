import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type ApiEventInput = {
  route: string
  method: string
  status_code: number
  latency_ms: number
  success: boolean
  user_id?: string | null
  error_message?: string | null
  meta?: Record<string, unknown>
}

export async function logApiEvent(input: ApiEventInput) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    await supabase.from('api_events').insert({
      route: input.route,
      method: input.method,
      status_code: input.status_code,
      latency_ms: input.latency_ms,
      success: input.success,
      user_id: input.user_id ?? null,
      error_message: input.error_message ?? null,
      meta: input.meta ?? {},
      env: process.env.NODE_ENV || 'unknown',
    })
  } catch {
    // swallow logging failures
  }
}

