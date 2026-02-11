'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { ExperienceMaterial } from '@/types/cover-letter'
import { ExperienceMaterialCard } from './ExperienceMaterialCard'
import { AddMaterialModal } from './AddMaterialModal'
import { Plus, Search, Lightbulb, ScrollText, X } from 'lucide-react'

interface Props {
  user: User
}

export function ExperienceMaterialsTab({ user }: Props) {
  const router = useRouter()
  const [materials, setMaterials] = useState<ExperienceMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showResumeGuide, setShowResumeGuide] = useState(false)

  useEffect(() => {
    fetchMaterials()
  }, [user.id])

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('experience_materials')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMaterials(data || [])
    } catch (error) {
      console.error('Failed to fetch materials:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMaterials = useMemo(() => {
    if (!searchQuery.trim()) return materials
    const q = searchQuery.toLowerCase()
    return materials.filter(m =>
      m.title.toLowerCase().includes(q) ||
      (m.content && m.content.toLowerCase().includes(q)) ||
      m.experience_type.toLowerCase().includes(q)
    )
  }, [materials, searchQuery])

  const handleCreate = async (data: { title: string; experience_type: string; content: string | null; resume_item_type?: string; resume_item_id?: string }) => {
    try {
      const { data: created, error } = await supabase
        .from('experience_materials')
        .insert({ user_id: user.id, ...data })
        .select()
        .single()

      if (error) throw error
      setMaterials(prev => [created, ...prev])
    } catch (error) {
      console.error('Failed to create material:', error)
      alert('소재 추가에 실패했습니다.')
    }
  }

  const handleUpdate = async (id: string, data: Partial<ExperienceMaterial>) => {
    try {
      const { error } = await supabase
        .from('experience_materials')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      setMaterials(prev => prev.map(m => m.id === id ? { ...m, ...data } : m))
    } catch (error) {
      console.error('Failed to update material:', error)
      alert('소재 수정에 실패했습니다.')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('experience_materials')
        .delete()
        .eq('id', id)

      if (error) throw error
      setMaterials(prev => prev.filter(m => m.id !== id))
    } catch (error) {
      console.error('Failed to delete material:', error)
      alert('소재 삭제에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">소재를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 툴바 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="소재 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>
        <button
          onClick={() => setShowResumeGuide(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium rounded-lg transition shadow-sm whitespace-nowrap"
        >
          <ScrollText className="w-4 h-4" />
          이력서 항목에서 불러오기
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          새 소재
        </button>
      </div>

      {/* 소재 그리드 */}
      {filteredMaterials.length === 0 ? (
        <div className="text-center py-16">
          <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">
            {searchQuery ? '검색 결과가 없습니다' : '아직 등록된 소재가 없어요'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {searchQuery ? '다른 키워드로 검색해보세요.' : '경험, 프로젝트, 활동 등을 소재로 정리해보세요.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredMaterials.map(material => (
            <ExperienceMaterialCard
              key={material.id}
              material={material}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* 추가 모달 */}
      <AddMaterialModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleCreate}
      />

      {/* 이력서 항목 안내 모달 */}
      {showResumeGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowResumeGuide(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">이력서 항목에서 불러오기</h3>
              <button onClick={() => setShowResumeGuide(false)} className="p-1 hover:bg-gray-100 rounded-md">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-600">이력서 페이지에서 각 항목 옆의 <span className="inline-flex items-center gap-0.5 font-medium text-yellow-600"><Lightbulb className="w-3.5 h-3.5" />전구 버튼</span>을 누르면 해당 내용이 자소서 소재로 바로 추가됩니다.</p>
              <ol className="text-sm text-gray-500 space-y-1.5 list-decimal list-inside">
                <li>이력서 페이지로 이동</li>
                <li>경력, 학력, 대외활동 등 항목 옆 <span className="text-yellow-600 font-medium">전구 아이콘</span> 클릭</li>
                <li>내용을 확인하고 소재로 저장</li>
              </ol>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowResumeGuide(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                닫기
              </button>
              <button
                onClick={() => { setShowResumeGuide(false); router.push('/resume') }}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                이동하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
