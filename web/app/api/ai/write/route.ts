import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getModel, parseGeminiJSON } from '@/lib/gemini'
import { countChars } from '@/types/cover-letter'
import { checkRateLimit } from '@/lib/rate-limit'

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

    const { allowed } = checkRateLimit(user.id)
    if (!allowed) {
      return NextResponse.json(
        { error: 'AI 기능 사용 한도에 도달했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      )
    }

    const { question_id, selected_material_ids, char_limit, include_space } = await request.json()

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

    // 선택된 소재 전문 fetch
    const { data: materials } = await supabase
      .from('experience_materials')
      .select('*')
      .in('id', selected_material_ids)
      .eq('user_id', user.id)

    if (!materials || materials.length === 0) {
      return NextResponse.json({ error: 'No materials found' }, { status: 404 })
    }

    const spaceText = include_space ? '공백 포함' : '공백 제외'

    const prompt = `당신은 한국 취업 자기소개서 전문 작성자입니다.

주어진 경험 소재를 활용하여 설득력 있는 자기소개서 답변을 작성하세요.

작성 원칙:
1. 위 소재의 구체적인 내용을 활용하여 답변 작성
2. 반드시 ${char_limit ? `${char_limit}자 이내 (${spaceText})` : '적절한 분량으로'} 작성
3. 회사와 직무에 맞게 핵심 역량 강조
4. 구체적 수치와 성과 포함
5. STAR 기법 활용 (상황-과제-행동-결과)
6. 자연스러운 한국어 문체

[공고 기본 정보]
- 회사명: ${jobInfo.company}
- 공고명: ${jobInfo.title}
${jobInfo.employee_types ? `- 채용유형: ${jobInfo.employee_types}` : ''}
${jobInfo.career ? `- 경력: ${jobInfo.career}` : ''}
${question.jd_info ? `\n[JD 및 회사정보]\n${question.jd_info}` : ''}

[자소서 질문]
- 질문 유형: ${question.question_type}
- 질문: ${question.question}
- 글자수 제한: ${char_limit ? `${char_limit}자 (${spaceText})` : '제한 없음'}

[활용할 경험 소재]
${materials.map((m: Record<string, unknown>, idx: number) => `${idx + 1}. ${m.title} (${m.experience_type})
${m.content || '내용 없음'}`).join('\n\n')}

위 경험들을 바탕으로 자기소개서 답변을 작성해주세요.
${char_limit ? `반드시 ${char_limit}자 이내(${spaceText})로 작성하세요.` : ''}

응답은 반드시 다음 JSON 형식으로만 작성하세요:
{
  "answer": "작성된 자기소개서 답변"
}`

    const model = getModel()
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    const parsed = parseGeminiJSON(responseText)
    const answer = (parsed.answer as string) || ''
    const charCount = countChars(answer, include_space ?? true)

    return NextResponse.json({
      success: true,
      data: {
        answer,
        char_count: charCount,
        within_limit: !char_limit || charCount <= char_limit,
      },
    })
  } catch (error: unknown) {
    console.error('AI Write error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate answer'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
