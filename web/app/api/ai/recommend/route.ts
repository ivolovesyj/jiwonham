import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getModel, parseGeminiJSON } from '@/lib/gemini'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { question_id } = await request.json()

    // 질문 fetch
    const { data: question, error: qError } = await supabase
      .from('cover_letter_questions')
      .select('*')
      .eq('id', question_id)
      .eq('user_id', user.id)
      .single()

    if (qError || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // 연결된 공고 정보
    let jobInfo = { company: '정보 없음', title: '정보 없음', employee_types: '', career: '' }
    if (question.saved_job_id) {
      const { data: job } = await supabase
        .from('saved_jobs')
        .select('company, title, detail')
        .eq('id', question.saved_job_id)
        .single()

      if (job) {
        jobInfo.company = job.company || '정보 없음'
        jobInfo.title = job.title || '정보 없음'
        const detail = job.detail as Record<string, unknown> | null
        if (detail) {
          jobInfo.employee_types = Array.isArray(detail.employee_types) ? detail.employee_types.join(', ') : ''
          jobInfo.career = typeof detail.career === 'string' ? detail.career : ''
        }
      }
    }

    // 유저의 경험 소재 전체 fetch
    const { data: materials } = await supabase
      .from('experience_materials')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!materials || materials.length === 0) {
      return NextResponse.json({
        success: true,
        data: { recommendations: [], total_recommended: 0, reasoning: '등록된 경험 소재가 없습니다. 먼저 경험 소재를 추가해주세요.' },
      })
    }

    const charLimit = question.char_limit

    const prompt = `당신은 한국 취업 준비생의 자기소개서 작성을 돕는 전문 컨설턴트입니다.

주어진 자소서 질문과 채용 정보를 바탕으로, 사용자의 경험 소재 중 가장 적합한 것들을 추천하세요.

추천 기준:
1. JD와의 관련성 (직무 요구사항, 회사 특성 부합)
2. 질문 유형에 대한 적합성
3. 구체적인 성과와 수치가 있는 경험 우선
4. 최신 경험 우선

글자수 제한에 따른 추천 개수:
- 300자 이하: 1~2개
- 500자 이하: 2~3개
- 800자 이상: 3~4개
- 제한 없음: 2~3개

[공고 기본 정보]
- 회사명: ${jobInfo.company}
- 공고명: ${jobInfo.title}
${jobInfo.employee_types ? `- 채용유형: ${jobInfo.employee_types}` : ''}
${jobInfo.career ? `- 경력: ${jobInfo.career}` : ''}
${question.jd_info ? `\n[JD 및 회사정보]\n${question.jd_info}` : ''}

[자소서 질문]
- 질문 유형: ${question.question_type}
- 질문: ${question.question}
- 글자수 제한: ${charLimit ? `${charLimit}자` : '제한 없음'}

[경험 소재 목록]
${materials.map((m: Record<string, unknown>, idx: number) => `${idx + 1}. ID: ${m.id}
   제목: ${m.title}
   유형: ${m.experience_type}
   내용: ${typeof m.content === 'string' ? m.content.substring(0, 200) : '내용 없음'}${typeof m.content === 'string' && m.content.length > 200 ? '...' : ''}`).join('\n\n')}

응답은 반드시 다음 JSON 형식으로만 작성하세요:
{
  "recommendations": [
    {
      "material_id": "소재의 ID (위 목록의 ID를 그대로 사용)",
      "reason": "추천 이유 (1-2문장)",
      "usage_suggestion": "이 소재를 답변에서 어떻게 활용하면 좋을지 한 줄 제안",
      "priority": 1
    }
  ],
  "total_recommended": 추천된_소재_수,
  "reasoning": "전체적인 추천 근거 (2-3문장)"
}`

    const model = getModel()
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    const data = parseGeminiJSON(responseText)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: unknown) {
    console.error('AI Recommend error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate recommendations'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
