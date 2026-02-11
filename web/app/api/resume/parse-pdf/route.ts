import { NextRequest, NextResponse } from 'next/server'
import { getModel } from '@/lib/gemini'

const PROMPT = `이력서 PDF에서 정보를 추출하여 아래 JSON 형식으로만 반환하세요.

규칙:
- 날짜는 반드시 "YYYY-MM" 형식 (예: "2024.12" → "2024-12", "2019. 03" → "2019-03")
- 생년월일은 "YYYY-MM-DD" 형식 (연도만 있으면 "1999-01-01")
- 값이 없으면 null, 배열이 비면 []
- is_current: 재직중/재학중/진행중이면 true, end_date는 null
- degree: 고졸/전문학사/학사/석사/박사/기타 중 하나 (대학교 4년제는 "학사", 고등학교는 "고졸")
- experience의 tasks: 업무내용 여러 줄을 \n으로 연결한 문자열
- 잡코리아 "인턴·대외활동" → activity, "수상" → award, "자격증" → certification, "어학" → language
- 원티드 "수상/자격증/기타" 중 자격증은 certification, 수상은 award로 분리
- "자격증명", "수여기관", "링크주소", "세부내용", "활동 내용" 같은 예시 텍스트는 무시
- 고등학교 학력은 education에 포함

{
  "personal": { "name": "", "birth_date": null, "phone": null, "email": null, "address": null },
  "summary": "",
  "education": [
    { "school": "", "degree": "학사", "major": "", "start_date": "YYYY-MM", "end_date": "YYYY-MM", "is_current": false, "gpa": null, "note": null }
  ],
  "experience": [
    { "company": "", "department": null, "position": "", "start_date": "YYYY-MM", "end_date": null, "is_current": false, "tasks": "", "achievements": null }
  ],
  "certification": [
    { "name": "", "issuer": "", "date": "YYYY-MM" }
  ],
  "language": [
    { "language": "", "test_name": "", "score": "", "date": "YYYY-MM" }
  ],
  "skills": [
    { "label": "" }
  ],
  "activity": [
    { "name": "", "organization": "", "start_date": "YYYY-MM", "end_date": null, "is_current": false, "description": null }
  ],
  "award": [
    { "name": "", "organization": "", "date": "YYYY-MM", "description": null }
  ],
  "links": [
    { "label": "", "url": "" }
  ]
}`

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File
    if (!file) return NextResponse.json({ error: 'PDF 파일이 없습니다.' }, { status: 400 })
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'PDF 파일이 너무 큽니다. (최대 20MB)' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const model = getModel()
    const result = await model.generateContent([
      { inlineData: { mimeType: 'application/pdf', data: base64 } },
      { text: PROMPT },
    ])

    const text = result.response.text()
    const cleaned = text.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json({ data: parsed })
  } catch (error) {
    console.error('PDF parse error:', error)
    return NextResponse.json({ error: 'PDF 분석 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
