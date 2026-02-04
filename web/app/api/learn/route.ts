import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST /api/learn
 * 사용자의 행동 데이터를 분석하여 학습된 가중치를 업데이트합니다.
 *
 * 호출 시점:
 * - 사용자가 여러 공고에 대해 액션(pass/hold/apply)을 취한 후
 * - 주기적으로 (예: 매 10개 액션마다)
 * - 사용자가 수동으로 "선호도 업데이트" 버튼 클릭 시
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    })

    // 사용자 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[API /learn] Updating learned weights for user: ${user.id}`)

    // 학습 함수 호출
    const { data, error } = await supabase.rpc('update_user_learned_weights', {
      p_user_id: user.id
    })

    if (error) {
      console.error('[API /learn] Error updating weights:', error)
      return NextResponse.json({ error: 'Failed to update learned weights' }, { status: 500 })
    }

    console.log('[API /learn] Result:', data)

    return NextResponse.json({
      success: true,
      updated_features: data?.updated_features || 0,
      message: `${data?.updated_features || 0}개의 특성 가중치가 업데이트되었습니다.`
    })

  } catch (error) {
    console.error('[API /learn] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/learn
 * 사용자의 현재 학습된 가중치를 조회합니다.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 학습된 가중치 조회
    const { data: weights, error } = await supabase.rpc('get_user_learned_weights', {
      p_user_id: user.id
    })

    if (error) {
      console.error('[API /learn] Error fetching weights:', error)
      return NextResponse.json({ error: 'Failed to fetch learned weights' }, { status: 500 })
    }

    // 타입별로 그룹화
    const grouped = {
      depth_two: [] as Array<{ value: string; weight: number; confidence: number }>,
      keyword: [] as Array<{ value: string; weight: number; confidence: number }>,
      region: [] as Array<{ value: string; weight: number; confidence: number }>,
    }

    for (const w of (weights || [])) {
      const item = {
        value: w.feature_value,
        weight: Number(w.weight),
        confidence: Number(w.confidence)
      }

      if (w.feature_type === 'depth_two') {
        grouped.depth_two.push(item)
      } else if (w.feature_type === 'keyword') {
        grouped.keyword.push(item)
      } else if (w.feature_type === 'region') {
        grouped.region.push(item)
      }
    }

    return NextResponse.json({
      weights: grouped,
      total: (weights || []).length,
      summary: {
        liked_jobs: grouped.depth_two.filter(d => d.weight > 0).map(d => d.value).slice(0, 5),
        disliked_jobs: grouped.depth_two.filter(d => d.weight < 0).map(d => d.value).slice(0, 5),
        liked_skills: grouped.keyword.filter(k => k.weight > 0).map(k => k.value).slice(0, 5),
        disliked_skills: grouped.keyword.filter(k => k.weight < 0).map(k => k.value).slice(0, 5),
      }
    })

  } catch (error) {
    console.error('[API /learn] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
