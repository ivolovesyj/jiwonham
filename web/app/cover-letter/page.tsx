'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Navigation } from '@/components/Navigation'
import { ExperienceMaterialsTab } from '@/components/cover-letter/ExperienceMaterialsTab'
import { CoverLetterQuestionsTab } from '@/components/cover-letter/CoverLetterQuestionsTab'
import { Lightbulb, PenTool, LogIn, Sparkles, FileText, Target } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

function CoverLetterContent() {
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const tabParam = searchParams.get('tab')
  const jobIdParam = searchParams.get('job_id')
  const [activeTab, setActiveTab] = useState<'materials' | 'questions'>(
    tabParam === 'questions' ? 'questions' : 'materials'
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto animate-bounce">
            <Image src="/logo-final.png" alt="지원함" width={96} height={96} className="w-full h-full object-contain" />
          </div>
          <p className="text-lg font-medium text-gray-700">자기소개서를 준비하는 중...</p>
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
              <div className="w-14 h-14 mx-auto mb-4 bg-blue-50 rounded-2xl flex items-center justify-center">
                <PenTool className="w-7 h-7 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">AI 자기소개서</h1>
              <p className="text-gray-500 text-sm">나의 경험을 소재로 정리하고, AI가 공고에 딱 맞는 자소서 초안을 써드려요.</p>
            </div>

            {/* 기능 카드 */}
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-gray-100 p-5 flex gap-4 shadow-sm">
                <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">경험 소재 정리</h3>
                  <p className="text-sm text-gray-500">경력, 프로젝트, 대외활동 등 나의 경험을 소재로 미리 정리해두세요. 자소서 작성 시 바로 활용할 수 있어요.</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5 flex gap-4 shadow-sm">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">공고 적합도 최적화</h3>
                  <p className="text-sm text-gray-500">지원할 공고의 JD를 입력하면 AI가 해당 공고에 맞춘 자소서 초안을 작성해드려요.</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5 flex gap-4 shadow-sm">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">AI 첨삭 & 초안 작성</h3>
                  <p className="text-sm text-gray-500">작성한 내용을 AI가 다듬어주거나, 소재를 바탕으로 첫 초안을 바로 생성해드려요.</p>
                </div>
              </div>
            </div>

            {/* 로그인 유도 */}
            <div className="bg-blue-600 rounded-xl p-5 text-center text-white">
              <p className="font-semibold mb-1">로그인하고 자소서 작성 시작하기</p>
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

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navigation />

      <main className="flex-1 p-3 sm:p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* 페이지 헤더 */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">자기소개서</h1>
            <p className="text-sm text-gray-500 mt-1">경험 소재를 정리하고, 공고별 자소서를 작성하세요.</p>
          </div>

          {/* 탭 전환 */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 w-fit shadow-sm">
            <button
              onClick={() => setActiveTab('materials')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'materials'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              경험 소재
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'questions'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <PenTool className="w-4 h-4" />
              자소서 작성
            </button>
          </div>

          {/* 탭 내용 */}
          {activeTab === 'materials' ? (
            <ExperienceMaterialsTab user={user} />
          ) : (
            <CoverLetterQuestionsTab user={user} initialJobId={jobIdParam} />
          )}
        </div>
      </main>
    </div>
  )
}

export default function CoverLetterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto animate-bounce">
            <Image src="/logo-final.png" alt="지원함" width={96} height={96} className="w-full h-full object-contain" />
          </div>
          <p className="text-lg font-medium text-gray-700">자기소개서를 준비하는 중...</p>
        </div>
      </div>
    }>
      <CoverLetterContent />
    </Suspense>
  )
}
