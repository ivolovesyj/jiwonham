'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Navigation } from '@/components/Navigation'
import { ExperienceMaterialsTab } from '@/components/cover-letter/ExperienceMaterialsTab'
import { CoverLetterQuestionsTab } from '@/components/cover-letter/CoverLetterQuestionsTab'
import { Lightbulb, PenTool, LogIn } from 'lucide-react'
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
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <LogIn className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">로그인이 필요해요</h2>
            <p className="text-gray-500 mb-6 text-sm">자기소개서를 작성하고 관리하려면 로그인해주세요.</p>
            <Link href="/login">
              <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition">
                로그인하기
              </button>
            </Link>
          </div>
        </div>
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
