'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ResumeData, SectionType, SECTION_LABELS, DEFAULT_SECTION_ORDER } from '@/types/resume'
import { X, Printer } from 'lucide-react'

interface Props {
  resume: ResumeData
  onClose: () => void
}

export function ResumePreviewModal({ resume, onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const handlePrint = () => window.print()

  const rawOrder = resume.section_order ?? DEFAULT_SECTION_ORDER
  const sectionOrder = rawOrder.includes('personal') ? rawOrder : ['personal' as SectionType, ...rawOrder]
  const visibleSections = sectionOrder.filter(s => resume.section_visibility?.[s] !== false)

  const formatDate = (d: string | null | undefined) => d ? d.replace('-', '.') : ''

  const content = <PreviewContent resume={resume} visibleSections={visibleSections} formatDate={formatDate} />

  return (
    <>
      {/* 화면 UI */}
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
            <h2 className="text-base font-bold text-gray-900">미리보기</h2>
            <div className="flex items-center gap-2">
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition">
                <Printer className="w-4 h-4" />PDF 저장
              </button>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          <div className="p-6 sm:p-8">
            {content}
          </div>
        </div>
      </div>

      {/* 인쇄 전용 영역: body 직속으로 portal 렌더링 */}
      {mounted && createPortal(
        <div className="resume-print-area">{content}</div>,
        document.body
      )}

      <style>{`
        .resume-print-area { display: none; }
        @media print {
          body > * { display: none !important; }
          body > .resume-print-area {
            display: block !important;
            padding: 15mm;
            background: white;
            box-sizing: border-box;
            min-height: 100vh;
          }
          @page { margin: 0; size: A4; }
        }
      `}</style>
    </>
  )
}

function PreviewContent({ resume, visibleSections, formatDate }: {
  resume: ResumeData
  visibleSections: SectionType[]
  formatDate: (d: string | null | undefined) => string
}) {
  return (
    <div className="space-y-6 text-sm text-gray-800">
      {/* 이력서 제목 / 인적사항 헤더 */}
      {visibleSections.includes('personal') && resume.personal?.name ? (
        <div className="text-center border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{resume.personal.name}</h1>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-500">
            {resume.personal.birth_date && <span>{resume.personal.birth_date}</span>}
            {resume.personal.phone && <span>{resume.personal.phone}</span>}
            {resume.personal.email && <span>{resume.personal.email}</span>}
            {resume.personal.address && <span>{resume.personal.address}</span>}
          </div>
        </div>
      ) : (
        <div className="text-center border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-900">이 력 서</h1>
        </div>
      )}

      {visibleSections.map(section => {
        if (section === 'personal') return null

        if (section === 'summary' && resume.summary) {
          return (
            <Section key={section} label={SECTION_LABELS.summary}>
              <p className="text-gray-700 leading-relaxed">{resume.summary}</p>
            </Section>
          )
        }
        if (section === 'education' && resume.education?.length > 0) {
          return (
            <Section key={section} label={SECTION_LABELS.education}>
              {resume.education.map(item => (
                <Row key={item.id}>
                  <span className="text-gray-500 w-28 flex-shrink-0">{formatDate(item.start_date)} ~ {item.is_current ? '재학중' : formatDate(item.end_date)}</span>
                  <div>
                    <span className="font-medium">{item.school}</span>
                    <span className="text-gray-500 ml-2">{item.degree} · {item.major}{item.gpa ? ` · 학점 ${item.gpa}` : ''}</span>
                    {item.note && <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>}
                  </div>
                </Row>
              ))}
            </Section>
          )
        }
        if (section === 'experience' && resume.experience?.length > 0) {
          return (
            <Section key={section} label={SECTION_LABELS.experience}>
              {resume.experience.map(item => (
                <div key={item.id} className="flex gap-4 pb-3 last:pb-0">
                  <span className="text-gray-500 w-28 flex-shrink-0 pt-0.5">{formatDate(item.start_date)} ~ {item.is_current ? '재직중' : formatDate(item.end_date)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{item.company}</span>
                      {item.department && <span className="text-gray-500">{item.department}</span>}
                      <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{item.position}</span>
                    </div>
                    <p className="text-gray-600 mt-1 whitespace-pre-wrap">{item.tasks}</p>
                    {item.achievements && <p className="text-blue-700 mt-0.5 whitespace-pre-wrap">· {item.achievements}</p>}
                  </div>
                </div>
              ))}
            </Section>
          )
        }
        if (section === 'certification' && resume.certification?.length > 0) {
          return (
            <Section key={section} label={SECTION_LABELS.certification}>
              {resume.certification.map(item => (
                <Row key={item.id}>
                  <span className="text-gray-500 w-28 flex-shrink-0">{formatDate(item.date)}</span>
                  <span><span className="font-medium">{item.name}</span><span className="text-gray-500 ml-2">{item.issuer}</span></span>
                </Row>
              ))}
            </Section>
          )
        }
        if (section === 'language' && resume.language?.length > 0) {
          return (
            <Section key={section} label={SECTION_LABELS.language}>
              {resume.language.map(item => (
                <Row key={item.id}>
                  <span className="text-gray-500 w-28 flex-shrink-0">{formatDate(item.date)}</span>
                  <span><span className="font-medium">{item.language}</span><span className="text-gray-500 ml-2">{item.test_name}</span><span className="font-semibold ml-2">{item.score}</span></span>
                </Row>
              ))}
            </Section>
          )
        }
        if (section === 'skills' && resume.skills?.length > 0) {
          return (
            <Section key={section} label={SECTION_LABELS.skills}>
              <div className="flex flex-wrap gap-1.5">
                {resume.skills.map(item => (
                  <span key={item.id} className="px-2 py-0.5 bg-gray-100 rounded text-sm">{item.label}</span>
                ))}
              </div>
            </Section>
          )
        }
        if (section === 'activity' && resume.activity?.length > 0) {
          return (
            <Section key={section} label={SECTION_LABELS.activity}>
              {resume.activity.map(item => (
                <Row key={item.id}>
                  <span className="text-gray-500 w-28 flex-shrink-0">{formatDate(item.start_date)} ~ {item.is_current ? '진행중' : formatDate(item.end_date)}</span>
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-gray-500 ml-2">{item.organization}</span>
                    {item.description && <p className="text-gray-600 mt-0.5">{item.description}</p>}
                  </div>
                </Row>
              ))}
            </Section>
          )
        }
        if (section === 'award' && resume.award?.length > 0) {
          return (
            <Section key={section} label={SECTION_LABELS.award}>
              {resume.award.map(item => (
                <Row key={item.id}>
                  <span className="text-gray-500 w-28 flex-shrink-0">{formatDate(item.date)}</span>
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-gray-500 ml-2">{item.organization}</span>
                    {item.description && <p className="text-gray-600 mt-0.5 text-xs">{item.description}</p>}
                  </div>
                </Row>
              ))}
            </Section>
          )
        }
        if (section === 'links' && resume.links?.length > 0) {
          return (
            <Section key={section} label={SECTION_LABELS.links}>
              {resume.links.map(item => (
                <Row key={item.id}>
                  <span className="text-gray-500 w-28 flex-shrink-0">{item.label}</span>
                  <a href={item.url} className="text-blue-600 break-all">{item.url}</a>
                </Row>
              ))}
            </Section>
          )
        }
        return null
      })}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-bold text-gray-900 border-b-2 border-gray-900 pb-1 mb-3">{label}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-4">{children}</div>
}
