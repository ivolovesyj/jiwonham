'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { User, LogIn } from 'lucide-react'
import Link from 'next/link'

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    const confirmed = confirm(
      '정말로 탈퇴하시겠습니까?\n이력서, 자기소개서 소재 등 모든 데이터가 삭제되며 복구할 수 없습니다.'
    )
    if (!confirmed) return

    setDeleting(true)
    try {
      const { error } = await supabase.rpc('delete_own_account')
      if (error) throw error
      await supabase.auth.signOut()
      router.push('/')
    } catch {
      alert('탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-lg font-medium text-gray-700">로딩 중...</p>
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
            <p className="text-gray-500 mb-6 text-sm">마이페이지를 이용하려면 로그인해주세요.</p>
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

      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* 계정 정보 */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user?.email}</h2>
                <p className="text-sm text-gray-600">회원</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>선호 조건은 채용공고 페이지의 필터에서 설정할 수 있습니다.</p>
            </div>
          </div>

          {/* 위험 구역 */}
          <div className="bg-white rounded-lg border border-red-100 p-6">
            <h3 className="text-base font-semibold text-red-600 mb-1">계정 탈퇴</h3>
            <p className="text-sm text-gray-500 mb-4">
              탈퇴 시 이력서, 자기소개서 소재, 지원 현황 등 모든 데이터가 영구 삭제됩니다.
            </p>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
            >
              {deleting ? '처리 중...' : '회원 탈퇴'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
