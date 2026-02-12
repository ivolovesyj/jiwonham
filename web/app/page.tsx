'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ApplicationWithJob, ApplicationStatus, RequiredDocuments } from '@/types/application'
import { CompactApplicationRow } from '@/components/CompactApplicationRow'
import { PinnedSection } from '@/components/PinnedSection'
import { AddExternalJobModal } from '@/components/AddExternalJobModal'
import { ApplicationToolbar, SortKey } from '@/components/ApplicationToolbar'
import { getDeadlineSortValue } from '@/components/DeadlineBadge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { trackEvent } from '@/lib/analytics'
import { AddQuestionModal } from '@/components/cover-letter/AddQuestionModal'
import { CoverLetterViewModal } from '@/components/cover-letter/CoverLetterViewModal'
import { StatsWidget } from '@/components/StatsWidget'
import { KanbanBoard } from '@/components/KanbanBoard'
import { EmptyStateIllustration } from '@/components/EmptyStateIllustration'
import { WeeklyTimeline } from '@/components/WeeklyTimeline'
import { Briefcase, Search, AlertTriangle, X, FlaskConical, List, LayoutGrid } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Navigation } from '@/components/Navigation'

const LOADING_MESSAGES = [
  '지원함이 열심히 정리 중!',
  '당신의 지원함을 채우는 중...',
  '합격의 기운을 수집 중...',
  '지원함 싹- 모으는 중!',
  '내 지원함 착착 정리 중!',
  '소중한 기회를 담는 중...',
]

const getRandomLoadingMessage = () => {
  return LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]
}

// 상태 정렬 우선순위 (숫자가 작을수록 상위)
const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  hold: 1,
  applied: 2,
  document_pass: 3,
  interviewing: 4,
  final: 5,
  accepted: 6,
  not_applying: 7,
  passed: 8,
  rejected: 9,
  declined: 10,
}

// 비로그인 사용자를 위한 샘플 데이터 (다양한 상태 미리보기)
const INITIAL_DEMO_APPLICATIONS: ApplicationWithJob[] = [
  {
    id: 'demo-1',
    user_id: 'demo',
    saved_job_id: 'demo-job-1',
    status: 'pending',
    created_at: '2026-02-01T10:00:00Z',
    applied_date: null,
    notes: null,
    required_documents: null,
    saved_job: {
      id: 'demo-job-1',
      user_id: 'demo',
      job_id: null,
      external_company: '토스',
      external_title: '프론트엔드 개발자',
      external_url: 'https://toss.im/career',
      external_location: '서울 강남구',
      external_deadline: '2026-02-15',
      created_at: '2026-02-01T10:00:00Z',
      is_pinned: true,
      pin_order: 0,
    },
  },
  {
    id: 'demo-2',
    user_id: 'demo',
    saved_job_id: 'demo-job-2',
    status: 'hold',
    created_at: '2026-02-02T10:00:00Z',
    applied_date: null,
    notes: '추후 검토 필요',
    required_documents: null,
    saved_job: {
      id: 'demo-job-2',
      user_id: 'demo',
      job_id: null,
      external_company: '카카오',
      external_title: 'React 개발자',
      external_url: 'https://careers.kakao.com',
      external_location: '경기 성남시 판교',
      external_deadline: '2026-02-20',
      created_at: '2026-02-02T10:00:00Z',
      is_pinned: false,
      pin_order: null,
    },
  },
  {
    id: 'demo-3',
    user_id: 'demo',
    saved_job_id: 'demo-job-3',
    status: 'applied',
    created_at: '2026-02-03T10:00:00Z',
    applied_date: '2026-02-06',
    notes: null,
    required_documents: { resume: 'ready', portfolio: 'ready' },
    saved_job: {
      id: 'demo-job-3',
      user_id: 'demo',
      job_id: null,
      external_company: '네이버',
      external_title: 'AI 엔지니어',
      external_url: 'https://recruit.navercorp.com',
      external_location: '경기 성남시 분당',
      external_deadline: '2026-02-25',
      created_at: '2026-02-03T10:00:00Z',
      is_pinned: false,
      pin_order: null,
    },
  },
  {
    id: 'demo-4',
    user_id: 'demo',
    saved_job_id: 'demo-job-4',
    status: 'interviewing',
    created_at: '2026-02-04T10:00:00Z',
    applied_date: '2026-02-05',
    notes: '2차 면접 대기 중',
    required_documents: { resume: 'ready', portfolio: 'ready', cover_letter: 'ready' },
    saved_job: {
      id: 'demo-job-4',
      user_id: 'demo',
      job_id: null,
      external_company: '라인',
      external_title: '백엔드 개발자',
      external_url: 'https://careers.linecorp.com',
      external_location: '서울 강남구',
      external_deadline: '2026-03-01',
      created_at: '2026-02-04T10:00:00Z',
      is_pinned: false,
      pin_order: null,
    },
  },
  {
    id: 'demo-5',
    user_id: 'demo',
    saved_job_id: 'demo-job-5',
    status: 'document_pass',
    created_at: '2026-01-25T10:00:00Z',
    applied_date: '2026-01-28',
    notes: '서류 합격! 면접 준비 중',
    required_documents: { resume: 'ready', portfolio: 'ready' },
    saved_job: {
      id: 'demo-job-5',
      user_id: 'demo',
      job_id: null,
      external_company: '쿠팡',
      external_title: '데이터 분석가',
      external_url: 'https://www.coupang.jobs',
      external_location: '서울 송파구',
      external_deadline: '2026-03-05',
      created_at: '2026-01-25T10:00:00Z',
      is_pinned: false,
      pin_order: null,
    },
  },
  {
    id: 'demo-6',
    user_id: 'demo',
    saved_job_id: 'demo-job-6',
    status: 'rejected',
    created_at: '2026-01-20T10:00:00Z',
    applied_date: '2026-01-22',
    notes: '불합격 - 다음 기회에 재도전',
    required_documents: null,
    saved_job: {
      id: 'demo-job-6',
      user_id: 'demo',
      job_id: null,
      external_company: '배달의민족',
      external_title: 'UX 디자이너',
      external_url: 'https://career.woowahan.com',
      external_location: '서울 송파구',
      external_deadline: '2026-02-10',
      created_at: '2026-01-20T10:00:00Z',
      is_pinned: false,
      pin_order: null,
    },
  },
  {
    id: 'demo-7',
    user_id: 'demo',
    saved_job_id: 'demo-job-7',
    status: 'pending',
    created_at: '2026-02-05T10:00:00Z',
    applied_date: null,
    notes: null,
    required_documents: null,
    saved_job: {
      id: 'demo-job-7',
      user_id: 'demo',
      job_id: null,
      external_company: '당근마켓',
      external_title: 'Product Designer',
      external_url: 'https://about.daangn.com/jobs',
      external_location: '서울 구로구',
      external_deadline: '2026-02-18',
      created_at: '2026-02-05T10:00:00Z',
      is_pinned: false,
      pin_order: null,
    },
  },
  {
    id: 'demo-8',
    user_id: 'demo',
    saved_job_id: 'demo-job-8',
    status: 'pending',
    created_at: '2026-02-06T10:00:00Z',
    applied_date: null,
    notes: '이력서 업데이트 필요',
    required_documents: null,
    saved_job: {
      id: 'demo-job-8',
      user_id: 'demo',
      job_id: null,
      external_company: '넥슨',
      external_title: '게임 클라이언트 개발',
      external_url: 'https://careers.nexon.com/',
      external_location: '경기 성남시 분당',
      external_deadline: '2026-02-22',
      created_at: '2026-02-06T10:00:00Z',
      is_pinned: false,
      pin_order: null,
    },
  },
  {
    id: 'demo-9',
    user_id: 'demo',
    saved_job_id: 'demo-job-9',
    status: 'applied',
    created_at: '2026-01-30T10:00:00Z',
    applied_date: '2026-02-03',
    notes: null,
    required_documents: { resume: 'ready', cover_letter: 'ready' },
    saved_job: {
      id: 'demo-job-9',
      user_id: 'demo',
      job_id: null,
      external_company: 'SK텔레콤',
      external_title: 'DevOps 엔지니어',
      external_url: 'https://careers.sktelecom.com/',
      external_location: '서울 중구',
      external_deadline: '2026-03-10',
      created_at: '2026-01-30T10:00:00Z',
      is_pinned: false,
      pin_order: null,
    },
  },
  {
    id: 'demo-10',
    user_id: 'demo',
    saved_job_id: 'demo-job-10',
    status: 'not_applying',
    created_at: '2026-01-28T10:00:00Z',
    applied_date: null,
    notes: '조건이 맞지 않아 지원 안 함',
    required_documents: null,
    saved_job: {
      id: 'demo-job-10',
      user_id: 'demo',
      job_id: null,
      external_company: 'LG전자',
      external_title: '임베디드 SW 개발',
      external_url: 'https://careers.lg.com/',
      external_location: '서울 영등포구',
      external_deadline: '2026-02-28',
      created_at: '2026-01-28T10:00:00Z',
      is_pinned: false,
      pin_order: null,
    },
  },
]

// localStorage 키
const DEMO_DATA_KEY = 'jiwonbox_demo_data'
const DEMO_INTERACTION_KEY = 'jiwonbox_demo_interactions'

// localStorage 헬퍼 함수
const getDemoData = (): ApplicationWithJob[] => {
  if (typeof window === 'undefined') return INITIAL_DEMO_APPLICATIONS
  try {
    const stored = localStorage.getItem(DEMO_DATA_KEY)
    if (!stored) return INITIAL_DEMO_APPLICATIONS
    return JSON.parse(stored)
  } catch {
    return INITIAL_DEMO_APPLICATIONS
  }
}

const saveDemoData = (data: ApplicationWithJob[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save demo data:', error)
  }
}

const getDemoInteractionCount = (): number => {
  if (typeof window === 'undefined') return 0
  try {
    const count = localStorage.getItem(DEMO_INTERACTION_KEY)
    return count ? parseInt(count, 10) : 0
  } catch {
    return 0
  }
}

const incrementDemoInteraction = (): number => {
  if (typeof window === 'undefined') return 0
  try {
    const count = getDemoInteractionCount() + 1
    localStorage.setItem(DEMO_INTERACTION_KEY, count.toString())
    return count
  } catch {
    return 0
  }
}

const resetDemoData = () => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(DEMO_DATA_KEY)
    localStorage.removeItem(DEMO_INTERACTION_KEY)
  } catch (error) {
    console.error('Failed to reset demo data:', error)
  }
}

export default function HomePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [applications, setApplications] = useState<ApplicationWithJob[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('pending')
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0])
  const initialLoadStartRef = useRef<number | null>(null)
  const [minLoadingComplete, setMinLoadingComplete] = useState(false)
  const [demoPhase, setDemoPhase] = useState(1)
  const [mounted, setMounted] = useState(false)

  // 데이터 로드 완료 여부 (탭 전환 시 재로드 방지)
  const dataLoadedRef = useRef(false)
  const lastUserIdRef = useRef<string | null>(null)

  // 뷰 모드
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban')

  // Phase 1: 검색, 정렬
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [deadlineFilter, setDeadlineFilter] = useState<string | null>(null)

  // Phase 2: 핀 상태 + 순서
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())
  const [pinOrder, setPinOrder] = useState<string[]>([])

  // Phase 3: 외부 공고 모달
  const [showExternalModal, setShowExternalModal] = useState(false)

  // 자소서 질문 추가 모달
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false)
  const [coverLetterJobId, setCoverLetterJobId] = useState<string | null>(null)

  // 자소서 보기 모달
  const [showCoverLetterView, setShowCoverLetterView] = useState(false)
  const [viewCoverLetterJobId, setViewCoverLetterJobId] = useState<string | null>(null)
  const [viewCoverLetterLabel, setViewCoverLetterLabel] = useState('')

  // Demo Mode (비로그인 사용자용)
  const [demoApplications, setDemoApplications] = useState<ApplicationWithJob[]>([])
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [demoPinnedIds, setDemoPinnedIds] = useState<Set<string>>(new Set())
  const [demoPinOrder, setDemoPinOrder] = useState<string[]>([])

  // 클라이언트 마운트 확인
  useEffect(() => {
    setMounted(true)
    setLoadingMessage(getRandomLoadingMessage())
    initialLoadStartRef.current = Date.now()

    // 사이트 내 페이지 이동 시에는 로딩 애니메이션 스킵 (최초 접속 시에만 표시)
    if (sessionStorage.getItem('jiwonbox_visited')) {
      setMinLoadingComplete(true)
    } else {
      sessionStorage.setItem('jiwonbox_visited', 'true')
    }
  }, [])

  // 최소 로딩 시간 보장 (1초)
  useEffect(() => {
    if (!initialLoadStartRef.current) return

    const minLoadingTime = 1000
    const elapsed = Date.now() - initialLoadStartRef.current
    const remaining = Math.max(0, minLoadingTime - elapsed)

    const timer = setTimeout(() => {
      setMinLoadingComplete(true)
    }, remaining)

    return () => clearTimeout(timer)
  }, [mounted])

  useEffect(() => {
    if (!authLoading && user) {
      // 같은 유저이고 이미 데이터 로드했으면 스킵 (탭 전환 시 재로드 방지)
      if (dataLoadedRef.current && lastUserIdRef.current === user.id) {
        setLoading(false)
        return
      }
      lastUserIdRef.current = user.id
      fetchApplications()
    } else if (!authLoading && !user) {
      dataLoadedRef.current = false
      lastUserIdRef.current = null
      // 비로그인 상태: 데모 데이터 로드
      const demoData = getDemoData()
      setDemoApplications(demoData)
      
      // 핀 상태 초기화
      const pinned = new Set<string>()
      const pinnedJobs: { id: string; pin_order: number }[] = []
      for (const app of demoData) {
        if (app.saved_job.is_pinned) {
          pinned.add(app.saved_job.id)
          pinnedJobs.push({ 
            id: app.saved_job.id, 
            pin_order: app.saved_job.pin_order || 0 
          })
        }
      }
      setDemoPinnedIds(pinned)
      setDemoPinOrder(pinnedJobs.sort((a, b) => a.pin_order - b.pin_order).map((j) => j.id))
      
      setLoading(false)
    }
  }, [user, authLoading])

  const fetchApplications = async () => {
    if (!user) return

    try {
      setLoading(true)

      const { data: savedJobs, error: savedError } = await supabase
        .from('saved_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (savedError) throw savedError

      if (!savedJobs || savedJobs.length === 0) {
        setApplications([])
        return
      }

      const applicationsData: ApplicationWithJob[] = []

      for (const job of savedJobs) {
        let { data: status } = await supabase
          .from('application_status')
          .select('*')
          .eq('user_id', user.id)
          .eq('saved_job_id', job.id)
          .single()

        if (!status) {
          const { data: newStatus, error: createError } = await supabase
            .from('application_status')
            .insert({
              user_id: user.id,
              saved_job_id: job.id,
              status: 'pending',
            })
            .select()
            .single()

          if (createError) {
            console.error('Failed to create status:', createError)
            continue
          }
          status = newStatus
        }

        applicationsData.push({
          ...status,
          saved_job: job,
        })
      }

      // 핀 상태 + 순서 로드
      const pinned = new Set<string>()
      const pinnedJobs: { id: string; pin_order: number }[] = []
      for (const job of savedJobs) {
        if ((job as any).is_pinned) {
          pinned.add(job.id)
          pinnedJobs.push({ id: job.id, pin_order: (job as any).pin_order || 0 })
        }
      }
      setPinnedIds(pinned)
      setPinOrder(pinnedJobs.sort((a, b) => a.pin_order - b.pin_order).map((j) => j.id))

      setApplications(applicationsData)
      dataLoadedRef.current = true  // 데이터 로드 완료 표시
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (applicationId: string, newStatus: ApplicationStatus) => {
    try {
      const updateData: any = { status: newStatus }

      if (newStatus === 'applied' && !applications.find((a) => a.id === applicationId)?.applied_date) {
        updateData.applied_date = new Date().toISOString().split('T')[0]
      }

      const { error } = await supabase
        .from('application_status')
        .update(updateData)
        .eq('id', applicationId)

      if (error) throw error

      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId
            ? { ...app, status: newStatus, applied_date: updateData.applied_date || app.applied_date }
            : app
        )
      )
      if (newStatus === 'applied') trackEvent('application_applied')
      else if (newStatus === 'accepted') trackEvent('application_accepted')
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('상태 변경에 실패했습니다.')
    }
  }

  const handleUpdateNotes = async (applicationId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('application_status')
        .update({ notes })
        .eq('id', applicationId)

      if (error) throw error

      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, notes } : app
        )
      )
    } catch (error) {
      console.error('Failed to update notes:', error)
      alert('메모 저장에 실패했습니다.')
    }
  }

  const handleUpdateDocuments = async (applicationId: string, documents: RequiredDocuments) => {
    try {
      const { error } = await supabase
        .from('application_status')
        .update({ required_documents: documents })
        .eq('id', applicationId)

      if (error) throw error

      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, required_documents: documents } : app
        )
      )
    } catch (error) {
      console.error('Failed to update documents:', error)
      alert('서류 정보 저장에 실패했습니다.')
    }
  }

  const handleUpdateDeadline = async (savedJobId: string, deadline: string) => {
    try {
      const { error } = await supabase
        .from('saved_jobs')
        .update({ deadline: deadline || null })
        .eq('id', savedJobId)

      if (error) throw error

      setApplications((prev) =>
        prev.map((app) =>
          app.saved_job.id === savedJobId
            ? { ...app, saved_job: { ...app.saved_job, deadline: deadline || null } }
            : app
        )
      )
    } catch (error) {
      console.error('Failed to update deadline:', error)
      alert('마감일 저장에 실패했습니다.')
    }
  }

  const handleDelete = async (applicationId: string, savedJobId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error: statusError } = await supabase
        .from('application_status')
        .delete()
        .eq('id', applicationId)

      if (statusError) throw statusError

      const { error: jobError } = await supabase
        .from('saved_jobs')
        .delete()
        .eq('id', savedJobId)

      if (jobError) throw jobError

      setApplications((prev) => prev.filter((app) => app.id !== applicationId))
      setPinnedIds((prev) => {
        const next = new Set(prev)
        next.delete(savedJobId)
        return next
      })
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  const handleTogglePin = async (savedJobId: string) => {
    const newPinned = new Set(pinnedIds)
    const isPinning = !newPinned.has(savedJobId)

    if (isPinning) {
      newPinned.add(savedJobId)
      setPinOrder((prev) => [...prev, savedJobId])
    } else {
      newPinned.delete(savedJobId)
      setPinOrder((prev) => prev.filter((id) => id !== savedJobId))
    }
    setPinnedIds(newPinned)

    // DB 업데이트
    try {
      await supabase
        .from('saved_jobs')
        .update({ is_pinned: isPinning, pin_order: isPinning ? pinOrder.length : 0 })
        .eq('id', savedJobId)
    } catch {
      // 컬럼 없어도 로컬 상태는 유지
    }
  }

  const handleReorderPins = async (newOrder: string[]) => {
    setPinOrder(newOrder)

    // DB에 순서 저장
    try {
      for (let i = 0; i < newOrder.length; i++) {
        await supabase
          .from('saved_jobs')
          .update({ pin_order: i })
          .eq('id', newOrder[i])
      }
    } catch {
      // 실패해도 로컬 상태는 유지
    }
  }

  const handleAddCoverLetterQuestion = (savedJobId: string) => {
    setCoverLetterJobId(savedJobId)
    setShowCoverLetterModal(true)
  }

  const handleViewCoverLetter = (savedJobId: string, jobLabel: string) => {
    setViewCoverLetterJobId(savedJobId)
    setViewCoverLetterLabel(jobLabel)
    setShowCoverLetterView(true)
  }

  const handleSaveCoverLetterQuestion = async (data: {
    saved_job_id: string | null
    question_type: string
    question: string
    char_limit: number | null
  }) => {
    if (!user) return
    try {
      const { error } = await supabase
        .from('cover_letter_questions')
        .insert({
          user_id: user.id,
          ...data,
          include_space: true,
          answer: null,
          jd_info: null,
        })
      if (error) throw error
    } catch (error) {
      console.error('Failed to create question:', error)
      alert('질문 추가에 실패했습니다.')
    }
  }

  const handleSaveExternal = async (data: { company: string; title: string; location: string; deadline: string; link: string; notes: string; image?: string }) => {
    if (!user) return
    try {
      // saved_jobs에 삽입
      const { data: savedJob, error: saveError } = await supabase
        .from('saved_jobs')
        .insert({
          user_id: user.id,
          job_id: `external_${Date.now()}`,
          source: 'external',
          company: data.company,
          title: data.title,
          location: data.location,
          link: data.link,
          deadline: data.deadline || null,
          is_external: true,
          source_url: data.link,
          company_image: data.image || null,
        })
        .select()
        .single()

      if (saveError) throw saveError

      // application_status 생성
      const { data: status, error: statusError } = await supabase
        .from('application_status')
        .insert({
          user_id: user.id,
          saved_job_id: savedJob.id,
          status: 'pending',
          notes: data.notes || null,
        })
        .select()
        .single()

      if (statusError) throw statusError

      // 로컬 상태 추가
      setApplications((prev) => [
        { ...status, saved_job: savedJob },
        ...prev,
      ])
      trackEvent('external_job_saved')
    } catch (error) {
      console.error('Failed to save external job:', error)
      alert('저장에 실패했습니다.')
    }
  }

  // ========== DEMO MODE HANDLERS (비로그인 사용자용) ==========
  
  const trackDemoInteraction = () => {
    const count = incrementDemoInteraction()
    if (count >= 3 && demoPhase === 1) {
      setDemoPhase(2)
    }
    if (count % 7 === 0) {
      setShowSignupModal(true)
    }
  }

  const handleDemoStatusChange = (applicationId: string, newStatus: ApplicationStatus) => {
    trackDemoInteraction()
    
    const updateData: Partial<ApplicationWithJob> = { status: newStatus }
    if (newStatus === 'applied' && !demoApplications.find((a) => a.id === applicationId)?.applied_date) {
      updateData.applied_date = new Date().toISOString().split('T')[0]
    }

    const updated = demoApplications.map((app) =>
      app.id === applicationId
        ? { ...app, ...updateData }
        : app
    )
    setDemoApplications(updated)
    saveDemoData(updated)
  }

  const handleDemoUpdateNotes = (applicationId: string, notes: string) => {
    trackDemoInteraction()
    
    const updated = demoApplications.map((app) =>
      app.id === applicationId ? { ...app, notes } : app
    )
    setDemoApplications(updated)
    saveDemoData(updated)
  }

  const handleDemoUpdateDocuments = (applicationId: string, documents: RequiredDocuments) => {
    trackDemoInteraction()
    
    const updated = demoApplications.map((app) =>
      app.id === applicationId ? { ...app, required_documents: documents } : app
    )
    setDemoApplications(updated)
    saveDemoData(updated)
  }

  const handleDemoUpdateDeadline = (savedJobId: string, deadline: string) => {
    trackDemoInteraction()
    
    const updated = demoApplications.map((app) =>
      app.saved_job.id === savedJobId
        ? { ...app, saved_job: { ...app.saved_job, external_deadline: deadline || null } }
        : app
    )
    setDemoApplications(updated)
    saveDemoData(updated)
  }

  const handleDemoDelete = (applicationId: string, savedJobId: string) => {
    if (!confirm('정말 삭제하시겠습니까? (데모 모드)')) return
    trackDemoInteraction()
    
    const updated = demoApplications.filter((app) => app.id !== applicationId)
    setDemoApplications(updated)
    saveDemoData(updated)
    
    setDemoPinnedIds((prev) => {
      const next = new Set(prev)
      next.delete(savedJobId)
      return next
    })
  }

  const handleDemoTogglePin = (savedJobId: string) => {
    trackDemoInteraction()
    
    const newPinned = new Set(demoPinnedIds)
    const isPinning = !newPinned.has(savedJobId)

    if (isPinning) {
      newPinned.add(savedJobId)
      setDemoPinOrder((prev) => [...prev, savedJobId])
    } else {
      newPinned.delete(savedJobId)
      setDemoPinOrder((prev) => prev.filter((id) => id !== savedJobId))
    }
    setDemoPinnedIds(newPinned)

    // localStorage에 핀 상태 저장
    const updated = demoApplications.map((app) =>
      app.saved_job.id === savedJobId
        ? { ...app, saved_job: { ...app.saved_job, is_pinned: isPinning, pin_order: isPinning ? demoPinOrder.length : null } }
        : app
    )
    setDemoApplications(updated)
    saveDemoData(updated)
  }

  const handleDemoReorderPins = (newOrder: string[]) => {
    trackDemoInteraction()
    setDemoPinOrder(newOrder)

    // localStorage에 순서 저장
    const updated = demoApplications.map((app) => {
      const index = newOrder.indexOf(app.saved_job.id)
      if (index !== -1) {
        return { ...app, saved_job: { ...app.saved_job, pin_order: index } }
      }
      return app
    })
    setDemoApplications(updated)
    saveDemoData(updated)
  }

  const handleDemoSaveExternal = (data: { company: string; title: string; location: string; deadline: string; link: string; notes: string; image?: string }) => {
    trackDemoInteraction()
    
    const newId = `demo-${Date.now()}`
    const newJobId = `demo-job-${Date.now()}`
    
    const newApp: ApplicationWithJob = {
      id: newId,
      user_id: 'demo',
      saved_job_id: newJobId,
      status: 'pending',
      created_at: new Date().toISOString(),
      applied_date: null,
      notes: data.notes || null,
      required_documents: null,
      saved_job: {
        id: newJobId,
        user_id: 'demo',
        job_id: null,
        external_company: data.company,
        external_title: data.title,
        external_url: data.link,
        external_location: data.location,
        external_deadline: data.deadline || null,
        created_at: new Date().toISOString(),
        is_pinned: false,
        pin_order: null,
        company_image: data.image || null,
      },
    }

    const updated = [newApp, ...demoApplications]
    setDemoApplications(updated)
    saveDemoData(updated)
  }

  const handleResetDemo = () => {
    if (!confirm('데모 데이터를 초기화하시겠습니까?')) return
    resetDemoData()
    const initial = getDemoData()
    setDemoApplications(initial)
    
    // 핀 상태 초기화
    const pinned = new Set<string>()
    const pinnedJobs: { id: string; pin_order: number }[] = []
    for (const app of initial) {
      if (app.saved_job.is_pinned) {
        pinned.add(app.saved_job.id)
        pinnedJobs.push({ 
          id: app.saved_job.id, 
          pin_order: app.saved_job.pin_order || 0 
        })
      }
    }
    setDemoPinnedIds(pinned)
    setDemoPinOrder(pinnedJobs.sort((a, b) => a.pin_order - b.pin_order).map((j) => j.id))
  }

  // ========== END DEMO MODE HANDLERS ==========

  // 필터 → 검색 → 마감일 필터 → 정렬
  const processedApplications = useMemo(() => {
    let result = filter === 'all'
      ? applications
      : applications.filter((app) => app.status === filter)

    // 검색
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((app) => {
        const company = app.saved_job.external_company || app.saved_job.company || ''
        const title = app.saved_job.external_title || app.saved_job.title || ''
        const location = app.saved_job.external_location || app.saved_job.location || ''
        return (
          company.toLowerCase().includes(q) ||
          title.toLowerCase().includes(q) ||
          location.toLowerCase().includes(q)
        )
      })
    }

    // 마감일 필터
    if (deadlineFilter) {
      result = result.filter((app) => {
        const dl = app.saved_job.external_deadline || app.saved_job.deadline
        return dl && dl.split('T')[0] === deadlineFilter
      })
    }

    // 정렬 (핀 제외 - 핀은 별도 섹션)
    const unpinned = result.filter((a) => !pinnedIds.has(a.saved_job.id))

    unpinned.sort((a, b) => {
      switch (sortKey) {
        case 'deadline':
          const deadlineA = a.saved_job.external_deadline || a.saved_job.deadline
          const deadlineB = b.saved_job.external_deadline || b.saved_job.deadline
          return getDeadlineSortValue(deadlineA) - getDeadlineSortValue(deadlineB)
        case 'status':
          return (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
        case 'created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    return unpinned
  }, [applications, filter, searchQuery, sortKey, pinnedIds, deadlineFilter])

  // 핀된 항목 (pinOrder 순서대로)
  const pinnedApplications = useMemo(() => {
    let result = filter === 'all'
      ? applications
      : applications.filter((app) => app.status === filter)

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((app) => {
        const company = app.saved_job.external_company || app.saved_job.company || ''
        const title = app.saved_job.external_title || app.saved_job.title || ''
        const location = app.saved_job.external_location || app.saved_job.location || ''
        return (
          company.toLowerCase().includes(q) ||
          title.toLowerCase().includes(q) ||
          location.toLowerCase().includes(q)
        )
      })
    }

    if (deadlineFilter) {
      result = result.filter((app) => {
        const dl = app.saved_job.external_deadline || app.saved_job.deadline
        return dl && dl.split('T')[0] === deadlineFilter
      })
    }

    const pinned = result.filter((a) => pinnedIds.has(a.saved_job.id))
    // pinOrder 순서대로 정렬
    return pinned.sort((a, b) => {
      const aIdx = pinOrder.indexOf(a.saved_job.id)
      const bIdx = pinOrder.indexOf(b.saved_job.id)
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
    })
  }, [applications, filter, searchQuery, pinnedIds, pinOrder, deadlineFilter])

  // 상태별 카운트
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: applications.length }
    for (const app of applications) {
      counts[app.status] = (counts[app.status] || 0) + 1
    }
    return counts
  }, [applications])

  // 마감 임박 알림
  const urgentCount = useMemo(() => {
    return applications.filter((app) => {
      const deadline = app.saved_job.external_deadline || app.saved_job.deadline
      if (!deadline) return false
      if (app.status === 'rejected' || app.status === 'accepted' || app.status === 'declined' || app.status === 'passed') return false
      const d = new Date(deadline)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      d.setHours(0, 0, 0, 0)
      const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return diff >= 0 && diff <= 3
    }).length
  }, [applications])

  // ========== DEMO MODE COMPUTED VALUES ==========
  
  const demoProcessedApplications = useMemo(() => {
    let result = filter === 'all'
      ? demoApplications
      : demoApplications.filter((app) => app.status === filter)

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((app) =>
        (app.saved_job.external_company || app.saved_job.company || '').toLowerCase().includes(q) ||
        (app.saved_job.external_title || app.saved_job.title || '').toLowerCase().includes(q) ||
        (app.saved_job.external_location || app.saved_job.location || '').toLowerCase().includes(q)
      )
    }

    if (deadlineFilter) {
      result = result.filter((app) => {
        const dl = app.saved_job.external_deadline || app.saved_job.deadline
        return dl && dl.split('T')[0] === deadlineFilter
      })
    }

    const unpinned = result.filter((a) => !demoPinnedIds.has(a.saved_job.id))

    unpinned.sort((a, b) => {
      switch (sortKey) {
        case 'deadline':
          const deadlineA = a.saved_job.external_deadline || a.saved_job.deadline
          const deadlineB = b.saved_job.external_deadline || b.saved_job.deadline
          return getDeadlineSortValue(deadlineA) - getDeadlineSortValue(deadlineB)
        case 'status':
          return (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
        case 'created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    return unpinned
  }, [demoApplications, filter, searchQuery, sortKey, demoPinnedIds, deadlineFilter])

  const demoPinnedApplications = useMemo(() => {
    let result = filter === 'all'
      ? demoApplications
      : demoApplications.filter((app) => app.status === filter)

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((app) =>
        (app.saved_job.external_company || app.saved_job.company || '').toLowerCase().includes(q) ||
        (app.saved_job.external_title || app.saved_job.title || '').toLowerCase().includes(q) ||
        (app.saved_job.external_location || app.saved_job.location || '').toLowerCase().includes(q)
      )
    }

    if (deadlineFilter) {
      result = result.filter((app) => {
        const dl = app.saved_job.external_deadline || app.saved_job.deadline
        return dl && dl.split('T')[0] === deadlineFilter
      })
    }

    const pinned = result.filter((a) => demoPinnedIds.has(a.saved_job.id))
    return pinned.sort((a, b) => {
      const aIdx = demoPinOrder.indexOf(a.saved_job.id)
      const bIdx = demoPinOrder.indexOf(b.saved_job.id)
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
    })
  }, [demoApplications, filter, searchQuery, demoPinnedIds, demoPinOrder, deadlineFilter])

  const demoStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: demoApplications.length }
    for (const app of demoApplications) {
      counts[app.status] = (counts[app.status] || 0) + 1
    }
    return counts
  }, [demoApplications])

  const demoUrgentCount = useMemo(() => {
    return demoApplications.filter((app) => {
      const deadline = app.saved_job.external_deadline || app.saved_job.deadline
      if (!deadline) return false
      if (app.status === 'rejected' || app.status === 'accepted' || app.status === 'declined' || app.status === 'passed') return false
      const d = new Date(deadline)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      d.setHours(0, 0, 0, 0)
      const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return diff >= 0 && diff <= 3
    }).length
  }, [demoApplications])

  // ========== END DEMO MODE COMPUTED VALUES ==========

  const filterButtons: { key: ApplicationStatus | 'all'; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'pending', label: '지원 예정' },
    { key: 'hold', label: '보류' },
    { key: 'applied', label: '지원 완료' },
    { key: 'document_pass', label: '서류 합격' },
    { key: 'interviewing', label: '면접 중' },
    { key: 'accepted', label: '합격' },
    { key: 'not_applying', label: '미지원' },
    { key: 'rejected', label: '불합격' },
    { key: 'passed', label: '지원안함' },
  ]

  // 로딩 화면
  if (!minLoadingComplete || authLoading || loading || !mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto animate-bounce">
            <Image src="/logo-final.png" alt="지원함" width={96} height={96} className="w-full h-full object-contain" />
          </div>
          <p className="mt-4 text-lg font-medium text-gray-700">{loadingMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navigation />

      {/* 히어로 배너 삭제됨 - 통합 데모 배너로 이동 */}

      <main className="flex-1 p-3 sm:p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">지원 관리</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">리스트</span>
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">칸반</span>
                </button>
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                총 {!user ? demoApplications.length : applications.length}개
              </div>
            </div>
          </div>

          {!user ? (
            // 비로그인 상태 - 전체 인터랙티브 데모 모드
            <>
              <style>{`
                @keyframes demo-bg { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
                @keyframes demo-shimmer { 0%{transform:translateX(-150%)} 100%{transform:translateX(150%)} }
                @keyframes demo-glow { 0%,100%{box-shadow:0 0 8px 2px rgba(251,191,36,0.25)} 50%{box-shadow:0 0 22px 6px rgba(251,191,36,0.55),0 0 40px 12px rgba(251,191,36,0.15)} }
                @keyframes sparkle { 0%,100%{opacity:1;transform:scale(1) rotate(0deg)} 50%{opacity:0.6;transform:scale(1.4) rotate(20deg)} }
                @keyframes demo-btn-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.7)} 50%{box-shadow:0 0 0 6px rgba(245,158,11,0)} }
              `}</style>

              {/* 통합 데모 + 로그인 유도 배너 */}
              <div
                className="relative mb-3 sm:mb-4 p-3 sm:p-4 rounded-xl overflow-hidden border-2 border-amber-300"
                style={{
                  background: 'linear-gradient(270deg,#fef3c7,#fde68a,#fed7aa,#fde68a,#fef3c7)',
                  backgroundSize: '300% 300%',
                  animation: 'demo-bg 4s ease infinite, demo-glow 2.5s ease-in-out infinite',
                }}
              >
                {/* 광택 스윕 */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.55) 50%,transparent 70%)',
                    animation: 'demo-shimmer 2.8s ease-in-out infinite',
                  }}
                />

                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {/* 통통 튀는 아이콘 */}
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 animate-bounce">
                      <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-bold text-amber-900 flex items-center gap-1 flex-wrap">
                        <span style={{ display:'inline-block', animation:'sparkle 1.6s ease-in-out infinite' }}>✨</span>
                        <span>{demoPhase >= 2 ? '이 데이터는 샘플이에요' : '지금은 체험 모드예요'}</span>
                        <span style={{ display:'inline-block', animation:'sparkle 1.6s ease-in-out infinite 0.8s' }}>✨</span>
                      </p>
                      <p className="text-xs sm:text-sm text-amber-700 truncate">
                        {demoPhase >= 2
                          ? '회원가입하면 실제 지원 현황을 관리할 수 있어요'
                          : '로그인하면 나만의 지원 내역이 안전하게 저장돼요'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href="/login">
                      <button
                        className={`px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs sm:text-sm transition whitespace-nowrap ${demoPhase >= 2 ? 'ring-2 ring-amber-300 ring-offset-1' : ''}`}
                        style={{ animation: 'demo-btn-pulse 2s ease-in-out infinite' }}
                      >
                        {demoPhase >= 2 ? '무료로 시작하기' : '로그인하고 시작'}
                      </button>
                    </Link>
                    <button
                      onClick={handleResetDemo}
                      className="text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-100 px-2 py-1.5 rounded-lg transition hidden sm:block"
                    >
                      초기화
                    </button>
                  </div>
                </div>
              </div>

              {/* 통계 위젯 */}
              <StatsWidget applications={demoApplications} />

              {/* 주간 타임라인 */}
              <WeeklyTimeline
                applications={demoApplications}
                selectedDate={deadlineFilter}
                onDayClick={(date) => {
                  setDeadlineFilter((prev) => prev === date ? null : date)
                  setFilter('all')
                  setViewMode('list')
                  trackDemoInteraction()
                }}
              />

              {/* 툴바 */}
              <ApplicationToolbar
                searchQuery={searchQuery}
                onSearchChange={(q) => {
                  setSearchQuery(q)
                  if (q) trackDemoInteraction()
                }}
                sortKey={sortKey}
                onSortChange={(key) => {
                  setSortKey(key)
                  trackDemoInteraction()
                }}
                onAddExternal={() => {
                  setShowExternalModal(true)
                  trackDemoInteraction()
                }}
              />

              {viewMode === 'kanban' ? (
                <KanbanBoard
                  applications={demoApplications}
                  onStatusChange={handleDemoStatusChange}
                  onDelete={handleDemoDelete}
                />
              ) : (
                <>
                  {/* 필터 탭 */}
                  <div className="bg-white rounded-lg border border-gray-200 p-2 sm:p-3 md:p-4 mb-4 sm:mb-6">
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {filterButtons.map(({ key, label }) => {
                        const count = demoStatusCounts[key] || 0
                        const alwaysShow = ['all', 'pending', 'applied', 'document_pass', 'interviewing', 'accepted'].includes(key)
                        if (!alwaysShow && count === 0) return null
                        return (
                          <Button
                            key={key}
                            size="sm"
                            variant={filter === key ? 'default' : 'outline'}
                            onClick={() => {
                              setFilter(key)
                              trackDemoInteraction()
                            }}
                            className={`text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9 ${count === 0 ? 'opacity-50' : ''}`}
                          >
                            {label} ({count})
                          </Button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 공고 목록 */}
                  {demoProcessedApplications.length === 0 && demoPinnedApplications.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                      <div className="mx-auto mb-4 flex justify-center">
                        <EmptyStateIllustration type={searchQuery ? 'no-results' : 'no-applications'} />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {searchQuery
                          ? `"${searchQuery}" 검색 결과가 없습니다`
                          : filter === 'all'
                            ? '데모 데이터를 추가해보세요'
                            : '해당 상태의 공고가 없습니다'}
                      </h3>
                      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                        외부 공고 추가 기능을 사용해 새 항목을 추가하거나,<br/>
                        초기화 버튼으로 샘플 데이터를 복원하세요
                      </p>
                      <Button
                        type="button"
                        onClick={() => setShowExternalModal(true)}
                        className="gap-2"
                      >
                        데모 공고 추가하기
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* 핀 고정 섹션 */}
                      <PinnedSection
                        pinnedApps={demoPinnedApplications}
                        pinnedIds={demoPinnedIds}
                        onReorder={handleDemoReorderPins}
                        onStatusChange={handleDemoStatusChange}
                        onUpdateNotes={handleDemoUpdateNotes}
                        onUpdateDocuments={handleDemoUpdateDocuments}
                        onUpdateDeadline={handleDemoUpdateDeadline}
                        onDelete={handleDemoDelete}
                        onTogglePin={handleDemoTogglePin}
                        onAddCoverLetterQuestion={handleAddCoverLetterQuestion}
                        onViewCoverLetter={handleViewCoverLetter}
                      />

                      {/* 구분선 */}
                      {demoPinnedApplications.length > 0 && demoProcessedApplications.length > 0 && (
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <div className="flex-1 border-t border-gray-200" />
                          <span className="text-xs text-gray-400">일반</span>
                          <div className="flex-1 border-t border-gray-200" />
                        </div>
                      )}

                      {/* 일반 공고 목록 */}
                      <div className="space-y-2">
                        <AnimatePresence mode="popLayout">
                          {demoProcessedApplications.map((application) => (
                            <motion.div
                              key={application.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -30 }}
                              transition={{ duration: 0.2 }}
                              layout
                            >
                              <CompactApplicationRow
                                application={application}
                                onStatusChange={handleDemoStatusChange}
                                onUpdateNotes={handleDemoUpdateNotes}
                                onUpdateDocuments={handleDemoUpdateDocuments}
                                onUpdateDeadline={handleDemoUpdateDeadline}
                                onDelete={handleDemoDelete}
                                isPinned={false}
                                onTogglePin={handleDemoTogglePin}
                                onAddCoverLetterQuestion={handleAddCoverLetterQuestion}
                                onViewCoverLetter={handleViewCoverLetter}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          ) : applications.length === 0 ? (
            // 로그인했지만 지원 내역 없음
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-6">
                <EmptyStateIllustration type="no-applications" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                아직 지원한 공고가 없어요
              </h3>
              <p className="text-gray-600 mb-8 max-w-md">
                채용공고 페이지에서 관심있는 공고를 찾아 지원하거나,<br />
                다른 사이트에서 지원한 내역을 직접 추가해보세요
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/jobs">
                  <Button size="lg" className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    채용공고 보러가기
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setShowExternalModal(true)}
                  className="flex items-center gap-2"
                >
                  지원 내역 직접 추가
                </Button>
              </div>
            </div>
          ) : (
            // 지원 관리 전체 기능
            <>
              {/* 통계 위젯 */}
              <StatsWidget applications={applications} />

              {/* 주간 타임라인 */}
              <WeeklyTimeline
                applications={applications}
                selectedDate={deadlineFilter}
                onDayClick={(date) => {
                  setDeadlineFilter((prev) => prev === date ? null : date)
                  setFilter('all')
                  setViewMode('list')
                }}
              />

              {/* 툴바 */}
              <ApplicationToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortKey={sortKey}
                onSortChange={setSortKey}
                onAddExternal={() => setShowExternalModal(true)}
              />

              {viewMode === 'kanban' ? (
                <KanbanBoard
                  applications={applications}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ) : (
                <>
                  {/* 필터 탭 */}
                  <div className="bg-white rounded-lg border border-gray-200 p-2 sm:p-3 md:p-4 mb-4 sm:mb-6">
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {filterButtons.map(({ key, label }) => {
                        const count = statusCounts[key] || 0
                        const alwaysShow = ['all', 'pending', 'applied', 'document_pass', 'interviewing', 'accepted'].includes(key)
                        if (!alwaysShow && count === 0) return null
                        return (
                          <Button
                            key={key}
                            size="sm"
                            variant={filter === key ? 'default' : 'outline'}
                            onClick={() => setFilter(key)}
                            className={`text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9 ${count === 0 ? 'opacity-50' : ''}`}
                          >
                            {label} ({count})
                          </Button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 공고 목록 */}
                  {processedApplications.length === 0 && pinnedApplications.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                      <div className="mx-auto mb-4 flex justify-center">
                        <EmptyStateIllustration type={searchQuery ? 'no-results' : 'no-applications'} />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {searchQuery
                          ? `"${searchQuery}" 검색 결과가 없습니다`
                          : filter === 'all'
                            ? '아직 지원한 공고가 없어요'
                            : '해당 상태의 공고가 없습니다'}
                      </h3>
                      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                        채용공고 페이지에서 관심있는 공고를 찾아 지원하거나,<br/>
                        다른 사이트에서 지원한 내역을 직접 추가해보세요
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <Link href="/jobs">
                          <Button className="gap-2">
                            <Briefcase className="w-4 h-4" />
                            채용공고 보러가기
                          </Button>
                        </Link>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowExternalModal(true)}
                          className="gap-2"
                        >
                          지원 내역 직접 추가
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* 핀 고정 섹션 */}
                      <PinnedSection
                        pinnedApps={pinnedApplications}
                        pinnedIds={pinnedIds}
                        onReorder={handleReorderPins}
                        onStatusChange={handleStatusChange}
                        onUpdateNotes={handleUpdateNotes}
                        onUpdateDocuments={handleUpdateDocuments}
                        onUpdateDeadline={handleUpdateDeadline}
                        onDelete={handleDelete}
                        onTogglePin={handleTogglePin}
                        onAddCoverLetterQuestion={handleAddCoverLetterQuestion}
                        onViewCoverLetter={handleViewCoverLetter}
                      />

                      {/* 구분선 */}
                      {pinnedApplications.length > 0 && processedApplications.length > 0 && (
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <div className="flex-1 border-t border-gray-200" />
                          <span className="text-xs text-gray-400">일반</span>
                          <div className="flex-1 border-t border-gray-200" />
                        </div>
                      )}

                      {/* 일반 공고 목록 */}
                      <div className="space-y-2">
                        <AnimatePresence mode="popLayout">
                          {processedApplications.map((application) => (
                            <motion.div
                              key={application.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -30 }}
                              transition={{ duration: 0.2 }}
                              layout
                            >
                              <CompactApplicationRow
                                application={application}
                                onStatusChange={handleStatusChange}
                                onUpdateNotes={handleUpdateNotes}
                                onUpdateDocuments={handleUpdateDocuments}
                                onUpdateDeadline={handleUpdateDeadline}
                                onDelete={handleDelete}
                                isPinned={false}
                                onTogglePin={handleTogglePin}
                                onAddCoverLetterQuestion={handleAddCoverLetterQuestion}
                                onViewCoverLetter={handleViewCoverLetter}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      {/* 외부 공고 추가 모달 */}
      <AddExternalJobModal
        isOpen={showExternalModal}
        onClose={() => setShowExternalModal(false)}
        onSave={!user ? handleDemoSaveExternal : handleSaveExternal}
      />

      {/* 자소서 질문 추가 모달 */}
      {user && (
        <AddQuestionModal
          isOpen={showCoverLetterModal}
          onClose={() => { setShowCoverLetterModal(false); setCoverLetterJobId(null) }}
          onSave={handleSaveCoverLetterQuestion}
          user={user}
          initialJobId={coverLetterJobId}
        />
      )}

      {/* 자소서 보기 모달 */}
      {user && viewCoverLetterJobId && (
        <CoverLetterViewModal
          isOpen={showCoverLetterView}
          onClose={() => { setShowCoverLetterView(false); setViewCoverLetterJobId(null) }}
          savedJobId={viewCoverLetterJobId}
          jobLabel={viewCoverLetterLabel}
          user={user}
        />
      )}

      {/* 회원가입 권유 모달 (데모 모드용) */}
      {!user && showSignupModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 mb-4 mx-auto bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                체험은 어떠셨나요?
              </h3>
              <p className="text-gray-600 mb-6">
                로그인하면 지금까지 체험한 기능을<br/>
                내 데이터로 쓸 수 있어요!
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/login" className="w-full">
                  <Button size="lg" className="w-full flex items-center justify-center gap-2">
                    회원가입하고 시작하기
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setShowSignupModal(false)}
                  className="w-full"
                >
                  계속 둘러보기
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                💡 데모 데이터는 브라우저에만 저장되며 언제든지 초기화할 수 있습니다
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
