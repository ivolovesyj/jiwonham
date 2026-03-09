import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const JOB_SELECT_COLUMNS = [
  'id',
  'source',
  'company',
  'company_image',
  'company_type',
  'title',
  'regions',
  'location',
  'career_min',
  'career_max',
  'employee_types',
  'deadline_type',
  'end_date',
  'depth_ones',
  'depth_twos',
  'keywords',
  'views',
  'detail',
  'education',
  'redirect_url',
  'affiliate',
  'original_created_at',
  'last_modified_at',
  'crawled_at',
  'is_active',
].join(', ')

// ============================================
// Jaro-Winkler 유사도 계산 (비용 없는 유사도 매칭)
// ============================================

function jaroWinklerDistance(s1: string, s2: string): number {
  const len1 = s1.length
  const len2 = s2.length

  if (len1 === 0 && len2 === 0) return 1.0
  if (len1 === 0 || len2 === 0) return 0.0

  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1
  const s1Matches = new Array(len1).fill(false)
  const s2Matches = new Array(len2).fill(false)

  let matches = 0
  let transpositions = 0

  // 매칭 찾기
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow)
    const end = Math.min(i + matchWindow + 1, len2)

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0.0

  // 전치(transposition) 계산
  let k = 0
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }

  // Jaro 유사도
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3

  // 공통 접두사 길이 (최대 4)
  let prefixLength = 0
  for (let i = 0; i < Math.min(len1, len2, 4); i++) {
    if (s1[i] === s2[i]) prefixLength++
    else break
  }

  // Jaro-Winkler 유사도 (p=0.1)
  return jaro + prefixLength * 0.1 * (1 - jaro)
}

// ============================================
// 회사명 정규화 함수
// ============================================

function normalizeCompanyName(name: string): string {
  if (!name) return ''

  return name
    .replace(/\(주\)/g, '')           // (주) 제거
    .replace(/\(유\)/g, '')           // (유) 제거
    .replace(/㈜/g, '')                // ㈜ 제거
    .replace(/주식회사/g, '')         // 주식회사 제거
    .replace(/유한회사/g, '')         // 유한회사 제거
    .replace(/유한책임회사/g, '')     // 유한책임회사 제거
    .replace(/\s+/g, '')              // 모든 공백 제거
    .toLowerCase()                    // 소문자로 변환
    .trim()
}


// ============================================
// 점수 계산 로직 (사용자 선호도 기반)
// ============================================

interface UserPreferences {
  preferred_job_types?: string[]
  preferred_locations?: string[]
  career_level?: string
  preferred_company_sizes?: string[]
  preferred_industries?: string[]
  min_salary?: number
  work_style?: string[]  // 고용형태 필터: 정규직, 계약직, 인턴 등
  preferred_company_types?: string[]  // 기업 유형 필터: 대기업, 스타트업 등
  preferred_education?: string[]  // 학력 필터: 무관, 고졸, 전문대졸, 학사, 석사, 박사
}

interface KeywordWeight {
  keyword: string
  weight: number
}

interface CompanyPref {
  company_name: string
  preference_score: number
}

// 행동 기반 학습 가중치
interface LearnedWeight {
  feature_type: string  // 'depth_two', 'keyword', 'region'
  feature_value: string
  weight: number        // -1.0 ~ 1.0
  confidence: number    // 0 ~ 1.0 (노출 횟수 기반 신뢰도)
}

interface JobRow {
  id: string
  source: string
  company: string
  company_image: string | null
  company_type: string | null  // 기업 유형 추가
  title: string
  regions: string[] | null
  location: string | null
  career_min: number | null
  career_max: number | null
  employee_types: string[] | null
  deadline_type: string | null
  end_date: string | null
  depth_ones: string[] | null
  depth_twos: string[] | null
  keywords: string[] | null
  views: number | null
  detail: Record<string, string> | null
  education: string | null  // 학력 추가
  redirect_url: string | null  // 원문 링크 (타 플랫폼 URL)
  affiliate: string | null     // 출처 플랫폼명
  original_created_at: string | null
  last_modified_at: string | null
  crawled_at: string
  is_active: boolean
}

function normalizeJobRow(job: any): JobRow {
  return {
    ...job,
    depth_ones: Array.isArray(job.depth_ones) ? job.depth_ones : (job.depth_ones || []),
    depth_twos: Array.isArray(job.depth_twos) ? job.depth_twos : (job.depth_twos || []),
    keywords: Array.isArray(job.keywords) ? job.keywords : (job.keywords || []),
    regions: Array.isArray(job.regions) ? job.regions : (job.regions || []),
    employee_types: Array.isArray(job.employee_types) ? job.employee_types : (job.employee_types || []),
  }
}

function scoreJob(
  job: JobRow,
  prefs: UserPreferences | null,
  keywordWeights: KeywordWeight[],
  companyPrefs: CompanyPref[],
  learnedWeights: LearnedWeight[] = [],  // 행동 기반 학습 가중치
  companyType: string | null = null,
  isInDB: boolean = false
): { score: number; reasons: string[]; warnings: string[]; matchesFilter: boolean } {
  let score = 50
  const reasons: string[] = []
  const warnings: string[] = []
  let matchesFilter = true

  const jobText = `${job.company} ${job.title} ${job.depth_ones?.join(' ') || ''} ${job.depth_twos?.join(' ') || ''} ${job.keywords?.join(' ') || ''} ${job.detail?.raw_content || ''} ${job.detail?.main_tasks || ''} ${job.detail?.requirements || ''}`.toLowerCase()

  if (!prefs) {
    return { score: 50, reasons: ['기본 추천'], warnings: [], matchesFilter: true }
  }

  // 1. 직무 매칭 (preferred_job_types) - 필수 필터
  // 다층 매칭: depth_twos (우선) > jobText (보조) > depth_ones (참고)
  if (prefs.preferred_job_types?.length) {
    const jobDepthTwos = job.depth_twos || []
    const jobDepthOnes = job.depth_ones || []
    let jobMatched = false
    let bestMatchScore = 0
    let bestMatchName = ''
    let matchType = ''

    for (const prefType of prefs.preferred_job_types) {
      const prefLower = prefType.toLowerCase()

      // 1단계: depth_twos에서 정확 매칭 (최우선 - 15점)
      const exactMatchInDepthTwos = jobDepthTwos.some(t => {
        const jobTypeLower = t.toLowerCase()
        return jobTypeLower === prefLower ||
          jobTypeLower.includes(prefLower) ||
          prefLower.includes(jobTypeLower)
      })

      if (exactMatchInDepthTwos) {
        score += 15
        reasons.push(`${prefType}`)
        jobMatched = true
        break
      }

      // 2단계: jobText에서 매칭 (본문 키워드 - 10점)
      if (jobText.includes(prefLower)) {
        score += 10
        reasons.push(`${prefType} (본문)`)
        jobMatched = true
        break
      }

      // 3단계: depth_twos에서 Jaro-Winkler 유사도 매칭 (임계값 0.85 - 12점)
      for (const jobDepthTwo of jobDepthTwos) {
        const similarity = jaroWinklerDistance(prefLower, jobDepthTwo.toLowerCase())
        if (similarity >= 0.85 && similarity > bestMatchScore) {
          bestMatchScore = similarity
          bestMatchName = prefType
          matchType = 'similarity'
        }
      }

      // 4단계: depth_ones에서 매칭 (대분류 일치 - 약한 신호, 5점)
      // 예: 사용자가 "프론트엔드" 선택, 공고에 "개발" 대분류만 있는 경우
      const matchInDepthOnes = jobDepthOnes.some(d => {
        const dLower = d.toLowerCase()
        // "개발" 대분류 안에 프론트엔드가 속하는지 의미적 연관성 체크
        return prefLower.includes(dLower) || dLower.includes(prefLower)
      })

      if (!jobMatched && matchInDepthOnes && bestMatchScore < 0.85) {
        bestMatchScore = 0.7 // 임계값보다 낮지만 참고용
        bestMatchName = prefType
        matchType = 'depth_one'
      }
    }

    // 유사도 매칭 성공
    if (!jobMatched && bestMatchScore >= 0.85) {
      score += 12
      reasons.push(`${bestMatchName} (유사)`)
      jobMatched = true
    }

    // 약한 매칭 (대분류만 일치)
    if (!jobMatched && matchType === 'depth_one') {
      score += 5
      reasons.push(`${bestMatchName} (관련)`)
      jobMatched = true
    }

    // 직무가 하나도 매칭되지 않으면 필터 불통과
    if (!jobMatched) {
      matchesFilter = false
      score = 0
      warnings.push('⚠️ 선호 직무 불일치')
    }
  }

  // 2. 지역 필터 (엄격한 필터링)
  if (prefs.preferred_locations?.length && job.location) {
    const locationMatch = prefs.preferred_locations.some(loc =>
      job.location!.includes(loc) || loc.includes(job.location!)
    )
    if (!locationMatch) {
      matchesFilter = false
      warnings.push(`⚠️ ${job.location} (선호 지역 불일치)`)
    }
  }

  // 3. 경력 필터 (엄격한 필터링)
  if (prefs.career_level) {
    const careerLevels = prefs.career_level.split(',').filter(Boolean)
    let careerMatched = false

    for (const level of careerLevels) {
      if (level === '신입' || level === '경력무관') {
        // 신입/경력무관: career_min이 0이거나 null인 공고
        if (job.career_min === 0 || job.career_min === null) {
          careerMatched = true
          reasons.push('신입 가능')
          break
        }
      } else if (level === '1-3') {
        // 1-3년: career_min이 3 이하인 공고
        if (job.career_min === null || job.career_min <= 3) {
          careerMatched = true
          break
        }
      } else if (level === '3-5') {
        // 3-5년: career_min이 5 이하인 공고
        if (job.career_min !== null && job.career_min >= 1 && job.career_min <= 5) {
          careerMatched = true
          break
        }
      } else if (level === '5-10') {
        // 5-10년: career_min이 5-10 범위인 공고
        if (job.career_min !== null && job.career_min >= 3 && job.career_min <= 10) {
          careerMatched = true
          break
        }
      } else if (level === '10+') {
        // 10년+: career_min이 10 이상인 공고
        if (job.career_min !== null && job.career_min >= 10) {
          careerMatched = true
          break
        }
      }
    }

    if (!careerMatched) {
      matchesFilter = false
      const minCareer = job.career_min !== null ? `경력 ${job.career_min}년 이상` : '경력 요구사항 불명확'
      warnings.push(`⚠️ ${minCareer} (경력 조건 불일치)`)
    }
  }

  // 3.5 고용형태 필터 (엄격한 필터링)
  if (prefs.work_style?.length) {
    if (!job.employee_types || job.employee_types.length === 0) {
      // employee_types 정보가 없는 공고는 필터링 제외
      matchesFilter = false
      warnings.push(`⚠️ 고용형태 정보 없음`)
    } else {
      // DB 값 정규화 매핑 (크롤러에서 영문으로 저장된 값 처리)
      // DB 실제 값: CONTRACTOR, TEMPORARY, 계약직, 계약직/일용직, 병역특례, 인턴, 일용직, 전환형인턴, 정규직, 체험형인턴, 프리랜서
      const normalizeEmployeeType = (type: string): string => {
        const upper = type.toUpperCase()
        if (upper === 'CONTRACTOR') return '프리랜서'
        if (upper === 'TEMPORARY') return '계약직'
        return type
      }

      const normalizedJobTypes = job.employee_types.map(normalizeEmployeeType)

      // 부분 문자열 매칭: '인턴'이 '전환형인턴', '체험형인턴' 등도 매칭
      const match = prefs.work_style.some(pref =>
        normalizedJobTypes.some(jobType =>
          jobType.includes(pref) || pref.includes(jobType)
        )
      )

      if (!match) {
        matchesFilter = false
        warnings.push(`⚠️ 고용형태 불일치`)
      } else {
        reasons.push('희망 고용형태')
      }
    }
  }

  // 3.6 기업 유형 필터 (엄격한 필터링)
  // DB 현황: 기타(50,228), 중소기업(21,381), 스타트업(6,032), 대기업(3,183), 유니콘(2,589), null(1,756), 외국계(934), 중견기업(882), 공공기관(166)
  if (prefs.preferred_company_types?.length) {
    if (!companyType) {
      // company_type null인 공고는 필터링 제외 (1,756개)
      matchesFilter = false
      warnings.push(`⚠️ 기업 유형 정보 없음`)
    } else if (companyType === '기타') {
      // '기타'는 정보가 부족하므로 필터링 제외 (50,228개)
      matchesFilter = false
      warnings.push(`⚠️ 기업 유형 미분류`)
    } else {
      const match = prefs.preferred_company_types.includes(companyType)
      if (!match) {
        matchesFilter = false
        warnings.push(`⚠️ ${companyType} (선호 유형 불일치)`)
      } else {
        reasons.push(`${companyType}`)
      }
    }
  }

  // 3.7 학력 필터 (엄격한 필터링 - 정확히 일치만)
  // DB 현황: 총 87,151개 중 16,397개만 학력 데이터 있음 (18.8%)
  // 분포: 무관(13,869), 학사(848), 전문대졸(787), 고졸(764), 석사(120), 박사(9)
  if (prefs.preferred_education?.length) {
    if (!job.education) {
      // education 정보가 없는 공고는 필터링 제외 (70,754개 = 81.2%)
      matchesFilter = false
      warnings.push(`⚠️ 학력 정보 없음`)
    } else {
      const match = prefs.preferred_education.includes(job.education)

      if (!match) {
        matchesFilter = false
        warnings.push(`⚠️ ${job.education} 요구 (학력 불일치)`)
      } else {
        reasons.push(`학력 ${job.education}`)
      }
    }
  }

  // 3.8 DB에 있는 회사 우선순위 (크롤링된 정보가 있는 회사)
  if (isInDB) {
    score += 5
    // reasons에는 추가하지 않음 (UI에 표시 안 함, 내부 우선순위만)
  }

  // 4. 학습된 키워드 가중치
  for (const kw of keywordWeights) {
    if (jobText.includes(kw.keyword.toLowerCase())) {
      const impact = Math.max(-5, Math.min(5, kw.weight))
      score += impact
      if (Math.abs(kw.weight) >= 3) {
        if (kw.weight > 0) reasons.push(`📈 "${kw.keyword}"`)
        else warnings.push(`📉 "${kw.keyword}"`)
      }
    }
  }

  // 5. 학습된 회사 선호도
  const companyPref = companyPrefs.find(c =>
    job.company.includes(c.company_name) || c.company_name.includes(job.company)
  )
  if (companyPref && Math.abs(companyPref.preference_score) >= 2) {
    const impact = Math.max(-10, Math.min(10, companyPref.preference_score))
    score += impact
    if (companyPref.preference_score >= 2) reasons.push('🏢 선호 기업')
    else if (companyPref.preference_score <= -2) warnings.push('🏢 비선호 기업')
  }

  // 6. 행동 기반 학습 가중치 적용
  if (learnedWeights.length > 0) {
    let learnedBonus = 0
    const learnedReasons: string[] = []

    const jobDepthTwos = (job.depth_twos || []).map(d => d.toLowerCase())
    const jobKeywords = (job.keywords || []).map(k => k.toLowerCase())
    const jobRegions = (job.regions || []).map(r => r.toLowerCase())

    for (const lw of learnedWeights) {
      const featureLower = lw.feature_value.toLowerCase()
      let matched = false

      if (lw.feature_type === 'depth_two') {
        matched = jobDepthTwos.some(d => d.includes(featureLower) || featureLower.includes(d))
      } else if (lw.feature_type === 'keyword') {
        matched = jobKeywords.some(k => k.includes(featureLower) || featureLower.includes(k))
      } else if (lw.feature_type === 'region') {
        matched = jobRegions.some(r => r.includes(featureLower) || featureLower.includes(r))
      }

      if (matched) {
        // 가중치 * 신뢰도 * 최대 10점
        const impact = Math.round(lw.weight * lw.confidence * 10)
        learnedBonus += impact

        // 영향력 있는 학습 결과만 표시
        if (Math.abs(impact) >= 3) {
          if (impact > 0) {
            learnedReasons.push(`🧠 ${lw.feature_value}`)
          }
        }
      }
    }

    // 학습 보너스 적용 (최대 ±15점)
    const cappedBonus = Math.max(-15, Math.min(15, learnedBonus))
    score += cappedBonus

    // 상위 2개 학습 이유만 추가
    reasons.push(...learnedReasons.slice(0, 2))
  }

  // 7. 최신 공고 부스트
  if (job.crawled_at) {
    const hoursSince = (Date.now() - new Date(job.crawled_at).getTime()) / (1000 * 60 * 60)
    if (hoursSince <= 24) {
      score += 5
      reasons.push('🆕 신규')
    } else if (hoursSince <= 72) {
      score += 3
    }
  }

  score = Math.max(0, Math.min(100, score))

  // 중복 키워드 제거 (순서 유지)
  const uniqueReasons = Array.from(new Set(reasons))

  return { score, reasons: uniqueReasons, warnings, matchesFilter }
}

// ============================================
// API Handler
// ============================================

export async function GET(request: Request) {
  const startTime = Date.now()
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const searchQuery = searchParams.get('search')?.trim() || ''

    // 인증 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    console.log('[API /jobs] Start - Token exists:', !!token)

    // 토큰이 없으면 비로그인 사용자: 기본 공고 제공
    if (!token) {
      console.log('[API /jobs] No token - using guest mode')
      const supabase = createClient(supabaseUrl, supabaseAnonKey)

      const today = new Date().toISOString().split('T')[0]
      let query = supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true)
        .or(`end_date.is.null,end_date.gte.${today}`)

      // 검색어가 있으면 서버에서 텍스트 검색
      if (searchQuery) {
        // 회사명, 공고명, keywords, depth_twos에서 검색
        query = query.or(`company.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%`)
      }

      const { data: jobs, error: jobsError } = await query
        .order('crawled_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (jobsError) {
        console.error('Jobs query error:', jobsError)
        return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
      }

      if (!jobs || jobs.length === 0) {
        console.log('[API /jobs] Guest mode - No jobs found')
        return NextResponse.json({
          jobs: [],
          total: 0,
          limit,
          offset,
          message: 'No jobs available. Please run the crawler first.',
        })
      }

      console.log('[API /jobs] Guest mode - Returning', jobs.length, 'jobs')

      // 비로그인 사용자: 최신순 공고, 기본 점수 50점
      const now = Date.now()
      const basicJobs = jobs.map((job: JobRow) => {
        const isNew = (now - new Date(job.crawled_at).getTime()) < 24 * 60 * 60 * 1000

        return {
          id: job.id,
          company: job.company,
          company_image: job.company_image,
          company_type: job.company_type,
          title: job.title,
          location: job.location || '위치 미정',
          score: 50,
          reason: isNew ? '🆕 신규 공고' : '최신 공고',
          reasons: isNew ? ['🆕 신규'] : ['최신 공고'],
          warnings: [],
          link: `https://zighang.com/recruitment/${job.id}`,
          redirect_url: job.redirect_url,
          affiliate: job.affiliate,
          source: job.source,
          crawledAt: job.crawled_at,
          detail: job.detail,
          depth_ones: job.depth_ones,
          depth_twos: job.depth_twos,
          keywords: job.keywords,
          career_min: job.career_min,
          career_max: job.career_max,
          employee_types: job.employee_types,
          deadline_type: job.deadline_type,
          end_date: job.end_date,
          is_new: isNew,
        }
      })

      // 검색 시 전체 건수 파악을 위한 카운트 쿼리
      let totalForSearch: number | undefined
      if (searchQuery) {
        let countQuery = supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)
          .or(`company.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%`)
        const { count } = await countQuery
        totalForSearch = count ?? undefined
      }

      return NextResponse.json({
        jobs: basicJobs,
        total: totalForSearch ?? basicJobs.length,
        limit,
        offset,
        hasMore: jobs.length === limit,
        ...(searchQuery && { searchTotal: totalForSearch }),
      })
    }

    // === 로그인 사용자: 맞춤형 추천 ===
    console.log('[API /jobs] Authenticated user mode')

    // 토큰을 포함한 supabase 클라이언트 생성 (RLS 통과용)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    })

    // 토큰으로 직접 유저 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    console.log(`[API /jobs] +${Date.now() - startTime}ms - Auth check done`)

    if (!user || userError) {
      console.log('[API /jobs] Auth failed:', userError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[API /jobs] User authenticated:', user.id)

    // 병렬로 데이터 가져오기
    const [prefsResult, keywordsResult, companiesResult, seenResult, learnedResult] = await Promise.all([
      // 1. 사용자 선호도
      supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
      // 2. 학습된 키워드 가중치 (수동 설정)
      supabase
        .from('keyword_weights')
        .select('keyword, weight')
        .eq('user_id', user.id)
        .order('weight', { ascending: false })
        .limit(100),
      // 3. 학습된 회사 선호도
      supabase
        .from('company_preference')
        .select('company_name, preference_score')
        .eq('user_id', user.id),
      // 4. 이미 본 공고 ID
      supabase
        .from('user_job_actions')
        .select('job_id')
        .eq('user_id', user.id),
      // 5. 행동 기반 학습 가중치
      supabase.rpc('get_user_learned_weights', { p_user_id: user.id }),
    ])

    console.log(`[API /jobs] +${Date.now() - startTime}ms - Parallel queries done`)

    const preferences: UserPreferences | null = prefsResult.data
    const keywordWeights: KeywordWeight[] = keywordsResult.data || []
    const companyPrefs: CompanyPref[] = companiesResult.data || []
    const seenJobIds = new Set(seenResult.data?.map(a => a.job_id) || [])
    const learnedWeights: LearnedWeight[] = learnedResult.data || []

    console.log(`[API /jobs] Learned weights: ${learnedWeights.length} features`)

    // 5. 활성 공고를 직접 조회한다.
    // RPC는 PostgREST 경로에서 generic plan 문제로 반복적으로 timeout 되었고,
    // 단순 인덱스 친화 조건만 DB에 맡기고 나머지는 기존 scoreJob 로직에서 처리하는 편이 안정적이다.
    const today = new Date().toISOString().split('T')[0]
    const targetCount = offset + limit
    const batchSize = searchQuery
      ? Math.min(300, Math.max(150, targetCount * 3))
      : Math.min(400, Math.max(200, targetCount * 4))
    const maxScanCount = searchQuery
      ? Math.min(2400, Math.max(900, targetCount * 25))
      : Math.min(3200, Math.max(1200, targetCount * 50))

    console.log('[API /jobs] Direct fetch config:', JSON.stringify({
      batchSize,
      maxScanCount,
      companyTypes: preferences?.preferred_company_types?.length || 0,
      educationFilters: preferences?.preferred_education?.length || 0,
    }))

    let jobs: JobRow[] = []
    let jobsError: any = null
    let rangeStart = 0

    while (rangeStart < maxScanCount) {
      let jobsQuery = supabase
        .from('jobs')
        .select(JOB_SELECT_COLUMNS)
        .eq('is_active', true)
        .or(`end_date.is.null,end_date.gte.${today}`)

      if (preferences?.preferred_company_types?.length) {
        jobsQuery = jobsQuery.in('company_type', preferences.preferred_company_types)
      }

      if (preferences?.preferred_education?.length) {
        jobsQuery = jobsQuery.in('education', preferences.preferred_education)
      }

      const { data: batchJobs, error: batchError } = await jobsQuery
        .order('crawled_at', { ascending: false })
        .range(rangeStart, rangeStart + batchSize - 1)

      if (batchError) {
        jobsError = batchError
        break
      }

      if (!batchJobs || batchJobs.length === 0) {
        break
      }

      jobs.push(...batchJobs.map(normalizeJobRow))
      rangeStart += batchJobs.length

      if (batchJobs.length < batchSize) {
        break
      }
    }

    console.log(`[API /jobs] +${Date.now() - startTime}ms - Direct fetch done, scanned ${jobs.length} jobs`)

    if (jobsError) {
      const errDetail = `code=${jobsError?.code}, message=${jobsError?.message}, hint=${jobsError?.hint}`
      console.error(`[API /jobs] Direct fetch FAILED: ${errDetail}`)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    if (jobs.length === 0) {
      return NextResponse.json({
        jobs: [],
        total: 0,
        limit,
        offset,
        message: 'No jobs available. Please run the crawler first.',
      })
    }

    // company_type은 이미 jobs 테이블에 포함되어 있음 (별도 조회 불필요)

    // 6. 이미 본 공고 제외 + 검색 필터링 + 점수 계산 + 정렬
    const now = Date.now()

    // 검색어 필터링 (서버 사이드)
    let filteredJobs: JobRow[] = jobs
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filteredJobs = jobs.filter((job: JobRow) =>
        job.company.toLowerCase().includes(q) ||
        job.title.toLowerCase().includes(q) ||
        (job.company_type && job.company_type.toLowerCase().includes(q)) ||
        (job.employee_types && job.employee_types.some((t: string) => t.toLowerCase().includes(q))) ||
        (job.depth_twos && job.depth_twos.some((d: string) => d.toLowerCase().includes(q))) ||
        (job.keywords && job.keywords.some((k: string) => k.toLowerCase().includes(q)))
      )
    }

    const scoredJobs = filteredJobs
      .filter((job: JobRow) => !seenJobIds.has(job.id))
      .map((job: JobRow) => {
        const companyType = job.company_type || '기타'
        const isInDB = job.company_type !== null && job.company_type !== '기타'
        const { score, reasons, warnings, matchesFilter } = scoreJob(job, preferences, keywordWeights, companyPrefs, learnedWeights, companyType, isInDB)
        const isNew = (now - new Date(job.crawled_at).getTime()) < 24 * 60 * 60 * 1000

        return {
          id: job.id,
          company: job.company,
          company_image: job.company_image,
          company_type: job.company_type,
          title: job.title,
          location: job.location || '위치 미정',
          score,
          reason: reasons[0] || '추천 공고',
          reasons,
          warnings,
          link: `https://zighang.com/recruitment/${job.id}`,
          redirect_url: job.redirect_url,
          affiliate: job.affiliate,
          source: job.source,
          crawledAt: job.crawled_at,
          detail: job.detail,
          depth_ones: job.depth_ones,
          depth_twos: job.depth_twos,
          keywords: job.keywords,
          career_min: job.career_min,
          career_max: job.career_max,
          employee_types: job.employee_types,
          deadline_type: job.deadline_type,
          end_date: job.end_date,
          is_new: isNew,
          matchesFilter,
        }
      })
      .filter(j => j.matchesFilter) // 필터 통과한 공고만
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return new Date(b.crawledAt).getTime() - new Date(a.crawledAt).getTime()
      })

    // 7. 40점 이상 필터 + 페이지네이션 (검색 시에는 점수 필터 완화)
    const scoreThreshold = searchQuery ? 0 : 40
    const passedJobs = scoredJobs.filter(j => j.score >= scoreThreshold)
    const paginatedJobs = passedJobs.slice(offset, offset + limit)

    console.log(`[API /jobs] +${Date.now() - startTime}ms - Total done, returning ${paginatedJobs.length} jobs (search: "${searchQuery}")`)

    return NextResponse.json({
      jobs: paginatedJobs,
      total: passedJobs.length,
      limit,
      offset,
      hasMore: offset + limit < passedJobs.length,
      ...(searchQuery && { searchTotal: passedJobs.length }),
    })

  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}
