import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const eventName = typeof body?.event_name === 'string' ? body.event_name : null
    if (!eventName) {
      return NextResponse.json({ error: 'event_name is required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const forwardedFor = request.headers.get('x-forwarded-for')
    const userAgent = request.headers.get('user-agent')
    const country = request.headers.get('x-vercel-ip-country')

    const payload = {
      event_name: eventName,
      event_time_utc: body.event_time_utc || new Date().toISOString(),
      anonymous_id: body.anonymous_id || null,
      user_id: body.user_id || null,
      session_id: body.session_id || null,
      is_authenticated: Boolean(body.user_id),
      page_path: body.page_path || null,
      referrer: body.referrer || null,
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      utm_content: body.utm_content || null,
      utm_term: body.utm_term || null,
      feature_name: body.feature_name || null,
      action: body.action || null,
      properties: body.properties || {},
      app_version: body.app_version || null,
      country: country || null,
      ip_address: forwardedFor?.split(',')[0]?.trim() || null,
      user_agent: userAgent || null,
      env: body.env || process.env.NODE_ENV || 'unknown',
    }

    const { error } = await supabase.from('product_events').insert(payload)
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 202 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 202 })
  }
}

