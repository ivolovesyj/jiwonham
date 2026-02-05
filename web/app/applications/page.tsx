'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 이 페이지의 기능은 메인 페이지(/)로 통합되었습니다.
// 기존 URL 호환성을 위해 메인 페이지로 리다이렉트합니다.
export default function ApplicationsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
        <p className="mt-4 text-gray-600">이동 중...</p>
      </div>
    </div>
  )
}
