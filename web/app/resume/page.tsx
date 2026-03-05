'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { SectionCard } from '@/components/resume/SectionCard'
import { PersonalSection } from '@/components/resume/sections/PersonalSection'
import { SummarySection } from '@/components/resume/sections/SummarySection'
import { EducationSection } from '@/components/resume/sections/EducationSection'
import { ExperienceSection } from '@/components/resume/sections/ExperienceSection'
import { CertificationSection } from '@/components/resume/sections/CertificationSection'
import { LanguageSection } from '@/components/resume/sections/LanguageSection'
import { SkillsSection } from '@/components/resume/sections/SkillsSection'
import { ActivitySection } from '@/components/resume/sections/ActivitySection'
import { AwardSection } from '@/components/resume/sections/AwardSection'
import { LinksSection } from '@/components/resume/sections/LinksSection'
import { ResumePreviewModal } from '@/components/resume/ResumePreviewModal'
import { ResumeVersionSelector } from '@/components/resume/ResumeVersionSelector'
import { AddMaterialModal } from '@/components/cover-letter/AddMaterialModal'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { trackEvent } from '@/lib/analytics'
import {
  ResumeData, SectionType, EducationItem, ExperienceItem, CertificationItem, LanguageItem, ActivityItem, AwardItem,
  DEFAULT_SECTION_ORDER, DEFAULT_SECTION_VISIBILITY,
} from '@/types/resume'
import { Eye, LogIn, Upload, FileUp, Lightbulb, PenTool } from 'lucide-react'
import Link from 'next/link'

// Supabase에 resumes 테이블이 필요합니다.
// SQL: CREATE TABLE resumes (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
//   title TEXT NOT NULL DEFAULT '기본 이력서',
//   is_default BOOLEAN DEFAULT false,
//   section_order TEXT[] DEFAULT ARRAY['summary','education','experience','certification','language','skills','activity','award','links'],
//   section_visibility JSONB DEFAULT '{"summary":true,"education":true,"experience":true,"certification":true,"language":true,"skills":true,"activity":false,"award":false,"links":false}',
//   summary TEXT DEFAULT '',
//   education JSONB DEFAULT '[]',
//   experience JSONB DEFAULT '[]',
//   certification JSONB DEFAULT '[]',
//   language JSONB DEFAULT '[]',
//   skills JSONB DEFAULT '[]',
//   activity JSONB DEFAULT '[]',
//   award JSONB DEFAULT '[]',
//   links JSONB DEFAULT '[]',
//   created_at TIMESTAMPTZ DEFAULT NOW(),
//   updated_at TIMESTAMPTZ DEFAULT NOW()
// );
// ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users can manage own resumes" ON resumes FOR ALL USING (auth.uid() = user_id);

const DEFAULT_NEW_RESUME = {
  title: '기본 이력서',
  is_default: true,
  section_order: DEFAULT_SECTION_ORDER,
  section_visibility: DEFAULT_SECTION_VISIBILITY,
  personal: null,
  summary: '',
  education: [],
  experience: [],
  certification: [],
  language: [],
  skills: [],
  activity: [],
  award: [],
  links: [],
}

export default function ResumePage() {
  const { user, loading: authLoading } = useAuth()
  const [resumes, setResumes] = useState<ResumeData[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [pdfImporting, setPdfImporting] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const [addedMaterialIds, setAddedMaterialIds] = useState<Set<string>>(new Set())
  type MaterialPrefill = { title: string; experience_type: string; content: string; resume_item_type: string; resume_item_id: string; modalTitle: string }
  const [materialModalPrefill, setMaterialModalPrefill] = useState<MaterialPrefill | null>(null)
  const [resumePageTracked, setResumePageTracked] = useState(false)

  const active = resumes.find(r => r.id === activeId) ?? null

  useEffect(() => {
    if (!resumePageTracked) {
      trackEvent('resume_page_viewed', { feature_name: 'resume', action: 'view' })
      setResumePageTracked(true)
    }
  }, [resumePageTracked])

  // ── 로드 ──────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }

    const fetchResumes = async () => {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error || !data || data.length === 0) {
        // 첫 방문 → 기본 이력서 생성
        const { data: created } = await supabase
          .from('resumes')
          .insert({ user_id: user.id, ...DEFAULT_NEW_RESUME })
          .select()
          .single()
        if (created) { setResumes([created]); setActiveId(created.id) }
      } else {
        setResumes(data)
        const def = data.find(r => r.is_default) ?? data[0]
        setActiveId(def.id)
      }
      setLoading(false)
    }

    fetchResumes()
  }, [user, authLoading])

  // ── 소재 추가됨 ID 로드 ────────────────────────────────
  useEffect(() => {
    if (!user) return
    supabase
      .from('experience_materials')
      .select('resume_item_id')
      .eq('user_id', user.id)
      .not('resume_item_id', 'is', null)
      .then(({ data }) => {
        if (data) setAddedMaterialIds(new Set(data.map((d: { resume_item_id: string }) => d.resume_item_id).filter(Boolean)))
      })
  }, [user])

  // ── DB 업데이트 헬퍼 ──────────────────────────────────
  const persist = useCallback(async (id: string, patch: Partial<ResumeData>) => {
    await supabase
      .from('resumes')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
  }, [])

  // ── 섹션 데이터 변경 ──────────────────────────────────
  const handleSectionChange = useCallback(async (type: SectionType, data: any) => {
    if (!activeId) return
    setResumes(prev => prev.map(r => r.id === activeId ? { ...r, [type]: data } : r))
    await persist(activeId, { [type]: data })
  }, [activeId, persist])

  // ── 섹션 표시/숨김 ────────────────────────────────────
  const REQUIRED: SectionType[] = ['education', 'experience']
  const handleToggleVisibility = useCallback(async (type: SectionType) => {
    if (!active || REQUIRED.includes(type)) return
    const next = { ...active.section_visibility, [type]: !active.section_visibility?.[type] }
    setResumes(prev => prev.map(r => r.id === activeId ? { ...r, section_visibility: next } : r))
    await persist(activeId!, { section_visibility: next })
  }, [active, activeId, persist])

  // ── 버전 관리 ─────────────────────────────────────────
  const handleCreate = async () => {
    if (!user) return
    const { data } = await supabase
      .from('resumes')
      .insert({ user_id: user.id, ...DEFAULT_NEW_RESUME, title: `이력서 ${resumes.length + 1}`, is_default: false })
      .select()
      .single()
    if (data) {
      setResumes(prev => [...prev, data])
      setActiveId(data.id)
      trackEvent('resume_created', { feature_name: 'resume', action: 'create', resume_id: data.id })
    }
  }

  const handleRename = async (id: string, title: string) => {
    setResumes(prev => prev.map(r => r.id === id ? { ...r, title } : r))
    await persist(id, { title })
  }

  const handleDelete = async (id: string) => {
    await supabase.from('resumes').delete().eq('id', id)
    const remaining = resumes.filter(r => r.id !== id)
    setResumes(remaining)
    if (activeId === id) setActiveId(remaining[0]?.id ?? null)
    trackEvent('resume_deleted', { feature_name: 'resume', action: 'delete', resume_id: id })
  }

  // ── 이력서 → 자소서 소재 ──────────────────────────────
  const handleEducationToMaterial = (item: EducationItem) => {
    const content = [item.major, item.gpa ? `학점: ${item.gpa}` : '', item.note || ''].filter(Boolean).join('\n')
    setMaterialModalPrefill({ title: `${item.school} ${item.degree}`, experience_type: '학업/연구', content, resume_item_type: 'education', resume_item_id: item.id, modalTitle: `소재로 추가 — ${item.school}` })
  }
  const handleExperienceToMaterial = (item: ExperienceItem) => {
    const content = [item.tasks, item.achievements ? `성과: ${item.achievements}` : ''].filter(Boolean).join('\n')
    setMaterialModalPrefill({ title: `${item.company} - ${item.position}`, experience_type: '인턴', content, resume_item_type: 'experience', resume_item_id: item.id, modalTitle: `소재로 추가 — ${item.company}` })
  }
  const handleActivityToMaterial = (item: ActivityItem) => {
    setMaterialModalPrefill({ title: `${item.name} (${item.organization})`, experience_type: '대외활동', content: item.description || '', resume_item_type: 'activity', resume_item_id: item.id, modalTitle: `소재로 추가 — ${item.name}` })
  }
  const handleAwardToMaterial = (item: AwardItem) => {
    setMaterialModalPrefill({ title: `${item.name} - ${item.organization}`, experience_type: '공모전', content: item.description || '', resume_item_type: 'award', resume_item_id: item.id, modalTitle: `소재로 추가 — ${item.name}` })
  }
  const handleCertificationToMaterial = (item: CertificationItem) => {
    const content = [item.issuer, item.date ? `취득: ${item.date.replace('-', '.')}` : ''].filter(Boolean).join('\n')
    setMaterialModalPrefill({ title: item.name, experience_type: '자격증', content, resume_item_type: 'certification', resume_item_id: item.id, modalTitle: `소재로 추가 — ${item.name}` })
  }
  const handleLanguageToMaterial = (item: LanguageItem) => {
    const content = [item.score, item.date ? `취득: ${item.date.replace('-', '.')}` : ''].filter(Boolean).join('\n')
    setMaterialModalPrefill({ title: `${item.language} ${item.test_name}`, experience_type: '학업/연구', content, resume_item_type: 'language', resume_item_id: item.id, modalTitle: `소재로 추가 — ${item.test_name}` })
  }
  const handleMaterialSave = async (data: { title: string; experience_type: string; content: string | null; resume_item_type?: string; resume_item_id?: string }) => {
    if (!user) return
    const { data: created } = await supabase
      .from('experience_materials')
      .insert({ user_id: user.id, ...data })
      .select()
      .single()
    if (created && data.resume_item_id) {
      setAddedMaterialIds(prev => new Set([...prev, data.resume_item_id!]))
    }
    setMaterialModalPrefill(null)
  }

  // ── PDF 불러오기 ───────────────────────────────────────
  const handlePdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeId) return
    e.target.value = ''

    setPdfImporting(true)
    try {
      const formData = new FormData()
      formData.append('pdf', file)

      const res = await fetch('/api/resume/parse-pdf', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok || !json.data) throw new Error(json.error || '파싱 실패')

      const d = json.data
      const newId = () => crypto.randomUUID()

      const patch: Partial<ResumeData> = {
        ...(d.personal?.name ? { personal: d.personal } : {}),
        ...(d.summary ? { summary: d.summary } : {}),
        ...(d.education?.length ? { education: d.education.map((x: any) => ({ ...x, id: newId() })) } : {}),
        ...(d.experience?.length ? { experience: d.experience.map((x: any) => ({ ...x, id: newId() })) } : {}),
        ...(d.certification?.length ? { certification: d.certification.map((x: any) => ({ ...x, id: newId() })) } : {}),
        ...(d.language?.length ? { language: d.language.map((x: any) => ({ ...x, id: newId() })) } : {}),
        ...(d.skills?.length ? { skills: d.skills.map((x: any) => ({ ...x, id: newId() })) } : {}),
        ...(d.activity?.length ? { activity: d.activity.map((x: any) => ({ ...x, id: newId() })) } : {}),
        ...(d.award?.length ? { award: d.award.map((x: any) => ({ ...x, id: newId() })) } : {}),
        ...(d.links?.length ? { links: d.links.map((x: any) => ({ ...x, id: newId() })) } : {}),
      }

      // 데이터가 있는 섹션은 자동으로 표시
      const active = resumes.find(r => r.id === activeId)!
      const vis = { ...active.section_visibility }
      if (patch.personal?.name) vis.personal = true
      if (patch.activity?.length) vis.activity = true
      if (patch.award?.length) vis.award = true
      if (patch.links?.length) vis.links = true
      patch.section_visibility = vis

      setResumes(prev => prev.map(r => r.id === activeId ? { ...r, ...patch } : r))
      await persist(activeId, patch)
      trackEvent('pdf_import_success')
      alert(`이력서를 불러왔습니다.`)
    } catch (err: any) {
      trackEvent('pdf_import_error')
      alert(err.message || 'PDF 분석에 실패했습니다.')
    } finally {
      setPdfImporting(false)
    }
  }

  // ── 렌더 ──────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Navigation />
        <div className="flex flex-1 items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Navigation />
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* 헤더 */}
            <div className="text-center pt-4">
              <div className="w-14 h-14 mx-auto mb-4 bg-green-50 rounded-2xl flex items-center justify-center">
                <Eye className="w-7 h-7 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">이력서 관리</h1>
              <p className="text-gray-500 text-sm">기존 이력서를 그대로 가져오거나, 직접 작성해 여러 버전으로 관리하세요.</p>
            </div>

            {/* 기능 카드 */}
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-gray-100 p-5 flex gap-4 shadow-sm">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">PDF로 자동 채우기</h3>
                  <p className="text-sm text-gray-500">잡코리아·원티드 등에서 쓰던 이력서 PDF를 올리면 AI가 자동으로 이력서를 채워드려요. 처음부터 다시 쓸 필요 없어요.</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5 flex gap-4 shadow-sm">
                <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">경험을 자소서 소재로</h3>
                  <p className="text-sm text-gray-500">이력서의 경력·프로젝트 항목을 버튼 하나로 자소서 소재로 바로 저장할 수 있어요.</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5 flex gap-4 shadow-sm">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <PenTool className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">자소서 초안으로 활용</h3>
                  <p className="text-sm text-gray-500">저장된 경험 소재를 바탕으로 AI가 지원 공고에 맞는 자소서 초안을 작성해드려요.</p>
                </div>
              </div>
            </div>

            {/* 로그인 유도 */}
            <div className="bg-blue-600 rounded-xl p-5 text-center text-white">
              <p className="font-semibold mb-1">로그인하고 이력서 작성 시작하기</p>
              <p className="text-blue-100 text-sm mb-4">카카오 계정으로 10초 만에 시작할 수 있어요.</p>
              <Link href="/login">
                <button className="px-6 py-2.5 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition text-sm">
                  로그인하기
                </button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!active) return null

  const rawOrder = active.section_order ?? DEFAULT_SECTION_ORDER
  const sectionOrder: SectionType[] = rawOrder.includes('personal') ? rawOrder : ['personal', ...rawOrder]
  const visibility: Record<SectionType, boolean> = { ...DEFAULT_SECTION_VISIBILITY, ...(active.section_visibility ?? {}) }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navigation />
      <main className="flex-1 p-3 sm:p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">이력서</h2>
              <ResumeVersionSelector
                resumes={resumes}
                activeId={activeId}
                onSelect={setActiveId}
                onCreate={handleCreate}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handlePdfImport}
              />
              <button
                onClick={() => pdfInputRef.current?.click()}
                disabled={pdfImporting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {pdfImporting ? 'AI 분석 중...' : '기존 이력서(PDF)로 자동 채우기'}
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                <Eye className="w-4 h-4" />미리보기
              </button>
            </div>
          </div>

          {/* 섹션 카드 목록 */}
          {sectionOrder.map(type => (
            <SectionCard
              key={type}
              type={type}
              isVisible={visibility[type] !== false}
              onToggleVisibility={() => handleToggleVisibility(type)}
            >
              {type === 'personal' && (
                <PersonalSection
                  data={active.personal}
                  onChange={data => handleSectionChange('personal', data)}
                />
              )}
              {type === 'summary' && (
                <SummarySection
                  value={active.summary ?? ''}
                  onChange={val => handleSectionChange('summary', val)}
                />
              )}
              {type === 'education' && (
                <EducationSection
                  items={active.education ?? []}
                  onChange={items => handleSectionChange('education', items)}
                  onAddToMaterial={handleEducationToMaterial}
                  addedMaterialIds={addedMaterialIds}
                />
              )}
              {type === 'experience' && (
                <ExperienceSection
                  items={active.experience ?? []}
                  onChange={items => handleSectionChange('experience', items)}
                  onAddToMaterial={handleExperienceToMaterial}
                  addedMaterialIds={addedMaterialIds}
                />
              )}
              {type === 'certification' && (
                <CertificationSection
                  items={active.certification ?? []}
                  onChange={items => handleSectionChange('certification', items)}
                  onAddToMaterial={handleCertificationToMaterial}
                  addedMaterialIds={addedMaterialIds}
                />
              )}
              {type === 'language' && (
                <LanguageSection
                  items={active.language ?? []}
                  onChange={items => handleSectionChange('language', items)}
                  onAddToMaterial={handleLanguageToMaterial}
                  addedMaterialIds={addedMaterialIds}
                />
              )}
              {type === 'skills' && (
                <SkillsSection
                  items={active.skills ?? []}
                  onChange={items => handleSectionChange('skills', items)}
                />
              )}
              {type === 'activity' && (
                <ActivitySection
                  items={active.activity ?? []}
                  onChange={items => handleSectionChange('activity', items)}
                  onAddToMaterial={handleActivityToMaterial}
                  addedMaterialIds={addedMaterialIds}
                />
              )}
              {type === 'award' && (
                <AwardSection
                  items={active.award ?? []}
                  onChange={items => handleSectionChange('award', items)}
                  onAddToMaterial={handleAwardToMaterial}
                  addedMaterialIds={addedMaterialIds}
                />
              )}
              {type === 'links' && (
                <LinksSection
                  items={active.links ?? []}
                  onChange={items => handleSectionChange('links', items)}
                />
              )}
            </SectionCard>
          ))}

        </div>
      </main>

      {showPreview && active && (
        <ResumePreviewModal resume={active} onClose={() => setShowPreview(false)} />
      )}

      {materialModalPrefill && (
        <AddMaterialModal
          isOpen={true}
          onClose={() => setMaterialModalPrefill(null)}
          onSave={handleMaterialSave}
          prefilledData={materialModalPrefill}
        />
      )}
    </div>
  )
}
