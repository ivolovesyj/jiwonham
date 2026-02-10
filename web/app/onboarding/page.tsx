'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Check, ChevronRight, ChevronLeft, Loader2, ThumbsUp, ThumbsDown, MapPin, Briefcase, ExternalLink, X } from 'lucide-react'
import { Job } from '@/types/job'

interface FilterOptions {
  depth_ones: string[]
  depth_twos_map: Record<string, string[]>
  regions: string[]
  employee_types: string[]
}

const CAREER_OPTIONS = [
  { value: '신입', label: '신입 (0년)' },
  { value: '1-3', label: '1~3년' },
  { value: '3-5', label: '3~5년' },
  { value: '5-10', label: '5~10년' },
  { value: '10+', label: '10년 이상' },
  { value: '경력무관', label: '경력무관' },
]

// 테스트용 미니 카드
function TestJobCard({ job, onLike, onPass }: { job: Job, onLike: () => void, onPass: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const tags = (job.depth_twos?.length ? job.depth_twos : job.depth_ones) || []

  return (
    <Card className="w-full border border-gray-200 bg-white">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          {job.company_image && (
            <img src={job.company_image} alt={job.company}
              className="w-8 h-8 rounded-lg object-contain bg-gray-50 border border-gray-100 flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 text-base">{job.company}</div>
            <div className="text-sm text-gray-700 leading-snug">{job.title}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
          <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />
            {job.career_min === 0 ? '신입' : job.career_min ? `${job.career_min}년+` : '경력무관'}
          </span>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md border border-purple-200">{tag}</span>
            ))}
            {job.employee_types?.map((t, i) => (
              <span key={`et-${i}`} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-200">{t}</span>
            ))}
          </div>
        )}

        {expanded && job.detail && (
          <div className="text-xs text-gray-600 space-y-2 max-h-32 overflow-y-auto border-t pt-2">
            {job.detail.main_tasks && <div><span className="font-semibold">주요 업무:</span> {job.detail.main_tasks.slice(0, 200)}...</div>}
            {job.detail.requirements && <div><span className="font-semibold">자격 요건:</span> {job.detail.requirements.slice(0, 200)}...</div>}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-600 hover:underline">
            {expanded ? '접기' : '상세보기'}
          </button>
          {(job.redirect_url || job.link) && (
            <a href={job.redirect_url || job.link} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />원문
              {job.affiliate && <span className="text-gray-400 ml-0.5">({job.affiliate})</span>}
            </a>
          )}
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={onPass}
            className="border-red-200 hover:bg-red-50 text-red-600"
          >
            <ThumbsDown className="w-3.5 h-3.5 mr-1" />관심없음
          </Button>
          <Button size="sm" onClick={onLike}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ThumbsUp className="w-3.5 h-3.5 mr-1" />관심있음
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [step, setStep] = useState(0) // 0: 대분류, 1: 소분류, 2: 경력, 3: 지역, 4: 고용형태, 5: 테스트
  const [options, setOptions] = useState<FilterOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 필터 선택값
  const [selectedDepthOnes, setSelectedDepthOnes] = useState<string[]>([])
  const [selectedDepthTwos, setSelectedDepthTwos] = useState<string[]>([])
  const [selectedCareer, setSelectedCareer] = useState<string>('')
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [selectedEmployeeTypes, setSelectedEmployeeTypes] = useState<string[]>([])

  // 테스트 단계
  const [testJobs, setTestJobs] = useState<Job[]>([])
  const [testIndex, setTestIndex] = useState(0)
  const [testResults, setTestResults] = useState<{ job: Job, liked: boolean }[]>([])
  const [loadingTest, setLoadingTest] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) fetchOptions()
  }, [user])

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    let token = session?.access_token
    if (!token) {
      const { data: refreshed } = await supabase.auth.refreshSession()
      token = refreshed.session?.access_token
    }
    return token
  }

  const fetchOptions = async () => {
    try {
      const token = await getToken()
      const res = await fetch('/api/filters', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) setOptions(await res.json())
    } catch (e) {
      console.error('Failed to fetch filter options:', e)
    } finally {
      setLoading(false)
    }
  }

  // 필터 저장 후 테스트 공고 10개 가져오기
  const handleFilterDone = async () => {
    if (!user) return
    setSaving(true)
    try {
      // depth_ones는 선택한 대분류, depth_twos는 소분류
      const finalJobTypes = selectedDepthTwos.length > 0
        ? selectedDepthTwos  // 소분류 선택했으면 소분류로
        : selectedDepthOnes  // 아니면 대분류로

      await supabase.from('user_preferences').upsert({
        user_id: user.id,
        preferred_job_types: finalJobTypes,
        preferred_locations: selectedRegions,
        career_level: selectedCareer || '경력무관',
        work_style: selectedEmployeeTypes,
      })

      // 테스트 공고 로드
      setLoadingTest(true)
      const token = await getToken()
      const res = await fetch('/api/jobs?limit=10&offset=0', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        const jobs: Job[] = (data.jobs || []).map((j: any) => ({
          id: j.id, company: j.company, company_image: j.company_image,
          title: j.title, location: j.location, score: j.score,
          reason: j.reason, reasons: j.reasons, warnings: j.warnings,
          link: j.link, source: j.source, detail: j.detail,
          depth_ones: j.depth_ones, depth_twos: j.depth_twos,
          keywords: j.keywords, career_min: j.career_min,
          career_max: j.career_max, employee_types: j.employee_types,
          deadline_type: j.deadline_type, end_date: j.end_date,
        }))
        setTestJobs(jobs)
        setStep(5) // 테스트 단계로
      }
    } catch (e) {
      console.error('Error:', e)
      alert('저장 실패')
    } finally {
      setSaving(false)
      setLoadingTest(false)
    }
  }

  const handleTestAction = (liked: boolean) => {
    const job = testJobs[testIndex]
    setTestResults(prev => [...prev, { job, liked }])
    setTestIndex(testIndex + 1)
  }

  // 테스트 완료 → 학습 데이터 저장 + 메인으로
  const handleTestComplete = async () => {
    if (!user) return
    setSaving(true)
    try {
      // 1. keyword_weights 초기 학습
      const keywordMap = new Map<string, { like: number, pass: number }>()
      for (const { job, liked } of testResults) {
        const words = [
          ...(job.depth_ones || []),
          ...(job.depth_twos || []),
          ...(job.keywords || []),
        ]
        for (const w of words) {
          const existing = keywordMap.get(w) || { like: 0, pass: 0 }
          if (liked) existing.like++
          else existing.pass++
          keywordMap.set(w, existing)
        }
      }

      const keywordRows = Array.from(keywordMap.entries()).map(([keyword, counts]) => ({
        user_id: user.id,
        keyword,
        weight: (counts.like * 2) - (counts.pass * 1.5),
        apply_count: counts.like,
        pass_count: counts.pass,
        hold_count: 0,
      }))

      if (keywordRows.length > 0) {
        await supabase.from('keyword_weights').upsert(keywordRows, {
          onConflict: 'user_id,keyword',
        })
      }

      // 2. company_preference 초기 학습
      const companyMap = new Map<string, { like: number, pass: number }>()
      for (const { job, liked } of testResults) {
        const existing = companyMap.get(job.company) || { like: 0, pass: 0 }
        if (liked) existing.like++
        else existing.pass++
        companyMap.set(job.company, existing)
      }

      const companyRows = Array.from(companyMap.entries()).map(([name, counts]) => ({
        user_id: user.id,
        company_name: name,
        preference_score: (counts.like * 3) - (counts.pass * 2),
        apply_count: counts.like,
        pass_count: counts.pass,
        hold_count: 0,
      }))

      if (companyRows.length > 0) {
        await supabase.from('company_preference').upsert(companyRows, {
          onConflict: 'user_id,company_name',
        })
      }

      // 3. user_job_actions 기록 (테스트 공고도 본 것으로 처리)
      const actionRows = testResults.map(({ job, liked }) => ({
        user_id: user.id,
        job_id: job.id,
        action: liked ? 'apply' : 'pass',
        company: job.company,
        job_title: job.title,
        location: job.location,
        keywords: job.reasons || [],
      }))

      if (actionRows.length > 0) {
        await supabase.from('user_job_actions').upsert(actionRows, {
          onConflict: 'user_id,job_id',
        })
      }

      // 4. onboarding 완료
      await supabase.from('user_profiles').upsert({
        id: user.id,
        onboarding_completed: true,
        email: user.email,
      })

      router.push('/')
    } catch (e) {
      console.error('Test save failed:', e)
      alert('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  // 온보딩 SKIP 처리
  const handleSkip = async () => {
    if (!user) return
    setSaving(true)
    try {
      // 기본값으로 user_preferences 생성
      const { error: prefError } = await supabase.from('user_preferences').upsert({
        user_id: user.id,
        preferred_job_types: [],
        preferred_locations: [],
        career_level: '경력무관',
        work_style: [],
      })

      if (prefError) {
        console.error('user_preferences 저장 실패:', prefError)
      }

      // onboarding 완료 처리
      const { error: profileError } = await supabase.from('user_profiles').upsert({
        id: user.id,
        onboarding_completed: true,
        email: user.email,
      })

      if (profileError) {
        console.error('user_profiles 저장 실패:', profileError)
      }

      // 저장 실패해도 일단 홈으로 이동 (사용자 경험 우선)
      router.push('/')
    } catch (e) {
      console.error('Skip failed:', e)
      // 에러가 나도 홈으로 이동
      router.push('/')
    } finally {
      setSaving(false)
    }
  }

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item])
  }

  const removeDepthOne = (depthOne: string) => {
    setSelectedDepthOnes(prev => prev.filter(d => d !== depthOne))
    // 해당 대분류의 소분류도 제거
    const twosToRemove = options?.depth_twos_map[depthOne] || []
    setSelectedDepthTwos(prev => prev.filter(dt => !twosToRemove.includes(dt)))
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // ===== 테스트 단계 (step 5) =====
  if (step === 5) {
    const likedCount = testResults.filter(r => r.liked).length
    const passedCount = testResults.filter(r => !r.liked).length

    // 테스트 완료
    if (testIndex >= testJobs.length || testIndex >= 10) {
      return (
        <div className="flex min-h-screen flex-col bg-gray-50">
          <div className="bg-white border-b px-4 py-3">
            <div className="max-w-md mx-auto">
              <div className="h-1.5 bg-blue-600 rounded-full" />
              <p className="text-xs text-gray-400 mt-2">테스트 완료!</p>
            </div>
          </div>
          <main className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md space-y-6 text-center">
              <div className="text-5xl">🎯</div>
              <h1 className="text-2xl font-bold text-gray-900">성향 분석 완료!</h1>
              <p className="text-gray-600">
                {testResults.length}개 공고를 평가했어요.<br />
                <span className="text-blue-600 font-semibold">{likedCount}개 관심</span> / <span className="text-red-500 font-semibold">{passedCount}개 패스</span>
              </p>
              <p className="text-sm text-gray-500">
                이 결과를 바탕으로 맞춤 공고를 추천해드릴게요.<br />
                사용하면서 추천이 점점 더 정확해집니다!
              </p>
              <Button
                onClick={handleTestComplete}
                disabled={saving}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                추천 공고 받으러 가기
              </Button>
            </div>
          </main>
        </div>
      )
    }

    // 테스트 진행 중
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <div className="bg-white border-b px-4 py-3">
          <div className="max-w-md mx-auto">
            <div className="flex gap-1">
              {Array.from({ length: Math.min(testJobs.length, 10) }).map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < testIndex ? (testResults[i]?.liked ? 'bg-blue-500' : 'bg-red-300') :
                  i === testIndex ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
              ))}
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-400">{testIndex + 1} / {Math.min(testJobs.length, 10)}</p>
              <div className="flex gap-3 text-xs">
                <span className="text-blue-600">👍 {likedCount}</span>
                <span className="text-red-500">👎 {passedCount}</span>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 flex flex-col items-center p-4">
          <div className="w-full max-w-md space-y-4">
            <div className="text-center py-2">
              <h2 className="text-lg font-bold text-gray-900">이 공고에 관심이 있나요?</h2>
              <p className="text-xs text-gray-500 mt-1">실제 공고입니다. 평가를 기반으로 맞춤 추천을 만들어요.</p>
            </div>

            {testJobs[testIndex] && (
              <TestJobCard
                job={testJobs[testIndex]}
                onLike={() => handleTestAction(true)}
                onPass={() => handleTestAction(false)}
              />
            )}
          </div>
        </main>
      </div>
    )
  }

  // ===== 필터 설정 단계 =====
  const filterSteps = [
    // Step 0: 직무 대분류
    {
      title: '어떤 분야에 관심이 있나요?',
      subtitle: '여러 개 선택 가능합니다',
      content: (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {options?.depth_ones.map(depthOne => (
              <button key={depthOne} onClick={() => toggleItem(selectedDepthOnes, setSelectedDepthOnes, depthOne)}
                className={`px-4 py-2 rounded-full text-sm border transition-all ${selectedDepthOnes.includes(depthOne) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
              >
                {selectedDepthOnes.includes(depthOne) && <Check className="w-3 h-3 inline mr-1" />}
                {depthOne}
              </button>
            ))}
          </div>

          {selectedDepthOnes.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs text-blue-700 font-semibold mb-2">선택한 분야 ({selectedDepthOnes.length}개)</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedDepthOnes.map(d => (
                  <span key={d} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-600 text-white rounded-full">
                    {d}
                    <button onClick={() => removeDepthOne(d)} className="hover:bg-blue-700 rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
      valid: selectedDepthOnes.length > 0,
    },
    // Step 1: 직무 소분류
    {
      title: '구체적인 직무를 선택해주세요',
      subtitle: `${selectedDepthOnes.join(', ')} 분야의 세부 직무 (선택사항)`,
      content: (
        <div className="space-y-4">
          {selectedDepthOnes.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              먼저 관심 분야를 선택해주세요
            </div>
          ) : (
            selectedDepthOnes.map(depthOne => {
              const twos = options?.depth_twos_map[depthOne] || []
              if (twos.length === 0) return null

              return (
                <div key={depthOne} className="space-y-2">
                  <div className="text-sm font-semibold text-gray-700">{depthOne}</div>
                  <div className="flex flex-wrap gap-2">
                    {twos.map(depthTwo => (
                      <button key={depthTwo} onClick={() => toggleItem(selectedDepthTwos, setSelectedDepthTwos, depthTwo)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${selectedDepthTwos.includes(depthTwo) ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                          }`}
                      >
                        {selectedDepthTwos.includes(depthTwo) && <Check className="w-3 h-3 inline mr-1" />}
                        {depthTwo}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })
          )}

          {selectedDepthTwos.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="text-xs text-purple-700 font-semibold mb-2">선택한 세부 직무 ({selectedDepthTwos.length}개)</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedDepthTwos.map(dt => (
                  <span key={dt} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-purple-600 text-white rounded-full">
                    {dt}
                    <button onClick={() => setSelectedDepthTwos(prev => prev.filter(x => x !== dt))} className="hover:bg-purple-700 rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 text-center">
            💡 세부 직무를 선택하지 않으면 선택한 분야 전체로 추천받습니다
          </div>
        </div>
      ),
      valid: true, // 소분류는 선택 안 해도 됨
    },
    // Step 2: 경력
    {
      title: '경력은 어느 정도인가요?',
      subtitle: '해당하는 경력을 선택해주세요',
      content: (
        <div className="grid grid-cols-2 gap-3">
          {CAREER_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setSelectedCareer(opt.value)}
              className={`px-4 py-3 rounded-xl text-sm border transition-all ${selectedCareer === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
            >{opt.label}</button>
          ))}
        </div>
      ),
      valid: selectedCareer !== '',
    },
    // Step 3: 지역
    {
      title: '어디서 일하고 싶나요?',
      subtitle: '선호 근무 지역을 선택해주세요 (여러 개 가능)',
      content: (
        <div className="flex flex-wrap gap-2">
          {options?.regions.map(region => (
            <button key={region} onClick={() => toggleItem(selectedRegions, setSelectedRegions, region)}
              className={`px-4 py-2 rounded-full text-sm border transition-all ${selectedRegions.includes(region) ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                }`}
            >
              {selectedRegions.includes(region) && <Check className="w-3 h-3 inline mr-1" />}
              {region}
            </button>
          ))}
        </div>
      ),
      valid: selectedRegions.length > 0,
    },
    // Step 4: 고용형태
    {
      title: '희망 고용 형태는?',
      subtitle: '여러 개 선택 가능합니다',
      content: (
        <div className="flex flex-wrap gap-2">
          {options?.employee_types.map(type => (
            <button key={type} onClick={() => toggleItem(selectedEmployeeTypes, setSelectedEmployeeTypes, type)}
              className={`px-4 py-2 rounded-full text-sm border transition-all ${selectedEmployeeTypes.includes(type) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
            >
              {selectedEmployeeTypes.includes(type) && <Check className="w-3 h-3 inline mr-1" />}
              {type}
            </button>
          ))}
        </div>
      ),
      valid: selectedEmployeeTypes.length > 0,
    },
  ]

  const currentStep = filterSteps[step]
  const isLastFilter = step === filterSteps.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더: 진행 표시 + SKIP 버튼 */}
        <div className="bg-white border-b px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <div className="flex gap-1">
                {filterSteps.map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                ))}
                <div className="h-1.5 flex-1 rounded-full bg-gray-200" />
              </div>
              <p className="text-xs text-gray-400 mt-1">{step + 1} / {filterSteps.length + 1}</p>
            </div>
            <button
              onClick={handleSkip}
              disabled={saving}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 hover:bg-gray-100 rounded-lg transition"
            >
              건너뛰기
            </button>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{currentStep.title}</h1>
              <p className="text-sm text-gray-500 mt-1">{currentStep.subtitle}</p>
            </div>

            <div className="max-h-[40vh] overflow-y-auto py-2">
              {currentStep.content}
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="bg-gray-50 border-t px-4 py-3 flex-shrink-0">
          <div className="flex gap-3">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-shrink-0">
                <ChevronLeft className="w-4 h-4 mr-1" />이전
              </Button>
            )}
            {!isLastFilter ? (
              <Button onClick={() => setStep(step + 1)} disabled={!currentStep.valid} className="flex-1">
                다음<ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleFilterDone}
                disabled={!currentStep.valid || saving || loadingTest}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {(saving || loadingTest) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                다음: 성향 테스트
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
