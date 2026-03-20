import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getModel, parseGeminiJSON } from '@/lib/gemini'
import { countChars } from '@/types/cover-letter'
import { logApiEvent } from '@/lib/api-analytics'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  let userId: string | null = null
  const respond = (
    status: number,
    body: Record<string, unknown>,
    success: boolean,
    errorMessage?: string,
    meta?: Record<string, unknown>,
    headers?: Record<string, string>
  ) => {
    logApiEvent({
      route: '/api/ai/feedback',
      method: 'POST',
      status_code: status,
      latency_ms: Date.now() - startedAt,
      success,
      user_id: userId,
      error_message: errorMessage || null,
      meta,
    })
    return NextResponse.json(body, { status, headers })
  }

  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return respond(401, { error: 'Unauthorized' }, false, 'Unauthorized')
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return respond(401, { error: 'Unauthorized' }, false, 'Unauthorized')
    }
    userId = user.id

    const { previous_answer, user_feedback, char_limit, include_space } = await request.json()

    if (!previous_answer || !user_feedback) {
      return respond(400, { error: 'previous_answer and user_feedback are required' }, false, 'Missing required fields')
    }

    const spaceText = include_space ? '공백 포함' : '공백 제외'

    const prompt = `당신은 이전 답변을 유저 피드백 기반으로 개선하는 자기소개서 전문가입니다.

사용자의 피드백을 정확히 반영하여 답변을 수정하세요.

개선 원칙:
1. 사용자 피드백을 최우선으로 반영
2. 기존 답변의 핵심 내용과 구조 유지
3. ${char_limit ? `글자수 제한 ${char_limit}자 (${spaceText}) 엄수` : '적절한 분량 유지'}
4. 수정한 부분을 간략히 설명해주세요

[이전 작성 답변]
${previous_answer}

[유저 피드백]
${user_feedback}

[제약 조건]
글자수 제한: ${char_limit ? `${char_limit}자 (${spaceText})` : '제한 없음'}

위 피드백을 반영하여 답변을 개선해주세요.

응답은 반드시 다음 JSON 형식으로만 작성하세요:
{
  "revised_answer": "개선된 답변",
  "changes_explanation": "어떤 부분을 어떻게 수정했는지 설명 (2-3문장)"
}`

    const model = getModel()
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    const parsed = parseGeminiJSON(responseText)
    const revisedAnswer = (parsed.revised_answer as string) || ''
    const charCount = countChars(revisedAnswer, include_space ?? true)

    return respond(200, {
      success: true,
      data: {
        revised_answer: revisedAnswer,
        changes_explanation: (parsed.changes_explanation as string) || '',
        char_count: charCount,
        within_limit: !char_limit || charCount <= char_limit,
      },
    }, true, undefined, { within_limit: !char_limit || charCount <= char_limit })
  } catch (error: unknown) {
    console.error('AI Feedback error:', error)
    const message = error instanceof Error ? error.message : 'Failed to revise answer'
    return respond(500, { error: message }, false, message)
  }
}
