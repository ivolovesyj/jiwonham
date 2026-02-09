'use client'

import { useState, useEffect, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { CoverLetterQuestionWithJob } from '@/types/cover-letter'
import { CoverLetterQuestionRow } from './CoverLetterQuestionRow'
import { AddQuestionModal } from './AddQuestionModal'
import { Plus, FileText, Building2, Unlink } from 'lucide-react'

interface Props {
  user: User
}

interface GroupedQuestions {
  jobId: string | null
  jobLabel: string
  questions: CoverLetterQuestionWithJob[]
}

export function CoverLetterQuestionsTab({ user }: Props) {
  const [questions, setQuestions] = useState<CoverLetterQuestionWithJob[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    fetchQuestions()
  }, [user.id])

  const fetchQuestions = async () => {
    try {
      // 질문 목록 fetch
      const { data, error } = await supabase
        .from('cover_letter_questions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // saved_job 정보 별도 fetch
      const jobIds = [...new Set((data || []).map(q => q.saved_job_id).filter(Boolean))]
      let jobMap: Record<string, any> = {}

      if (jobIds.length > 0) {
        const { data: jobs } = await supabase
          .from('saved_jobs')
          .select('id, company, title, external_company, external_title')
          .in('id', jobIds)

        if (jobs) {
          jobMap = Object.fromEntries(jobs.map(j => [j.id, j]))
        }
      }

      const questionsWithJobs = (data || []).map(q => ({
        ...q,
        saved_job: q.saved_job_id ? jobMap[q.saved_job_id] || null : null,
      }))

      setQuestions(questionsWithJobs)
    } catch (error) {
      console.error('Failed to fetch questions:', error)
    } finally {
      setLoading(false)
    }
  }

  // 공고별 그룹핑
  const groupedQuestions = useMemo((): GroupedQuestions[] => {
    const groups = new Map<string, GroupedQuestions>()

    questions.forEach(q => {
      const jobId = q.saved_job_id || '__none__'

      if (!groups.has(jobId)) {
        let jobLabel = '공고 미연결'
        if (q.saved_job) {
          const company = q.saved_job.external_company || q.saved_job.company || '회사명 없음'
          const title = q.saved_job.external_title || q.saved_job.title || '공고명 없음'
          jobLabel = `${company} - ${title}`
        }
        groups.set(jobId, {
          jobId: q.saved_job_id,
          jobLabel,
          questions: [],
        })
      }

      groups.get(jobId)!.questions.push(q)
    })

    // 공고 연결된 것 먼저, 미연결은 마지막
    const sorted = Array.from(groups.values()).sort((a, b) => {
      if (a.jobId === null && b.jobId !== null) return 1
      if (a.jobId !== null && b.jobId === null) return -1
      return 0
    })

    return sorted
  }, [questions])

  const handleCreate = async (data: {
    saved_job_id: string | null
    question_type: string
    question: string
    char_limit: number | null
  }) => {
    try {
      // 1) insert
      const { data: created, error } = await supabase
        .from('cover_letter_questions')
        .insert({
          user_id: user.id,
          ...data,
          include_space: true,
          answer: null,
          jd_info: null,
        })
        .select('*')
        .single()

      if (error) throw error

      // 2) saved_job 정보 별도 fetch
      let savedJob = null
      if (created.saved_job_id) {
        const { data: jobData } = await supabase
          .from('saved_jobs')
          .select('id, company, title, external_company, external_title')
          .eq('id', created.saved_job_id)
          .single()
        savedJob = jobData
      }

      setQuestions(prev => [{ ...created, saved_job: savedJob }, ...prev])
    } catch (error) {
      console.error('Failed to create question:', error)
      alert('질문 추가에 실패했습니다.')
    }
  }

  const handleUpdate = async (id: string, data: Partial<CoverLetterQuestionWithJob>) => {
    try {
      // saved_job 관계 필드 제외
      const { saved_job, ...updateData } = data as any
      const { error } = await supabase
        .from('cover_letter_questions')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...data } : q))
    } catch (error) {
      console.error('Failed to update question:', error)
      alert('질문 수정에 실패했습니다.')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cover_letter_questions')
        .delete()
        .eq('id', id)

      if (error) throw error
      setQuestions(prev => prev.filter(q => q.id !== id))
    } catch (error) {
      console.error('Failed to delete question:', error)
      alert('질문 삭제에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">질문을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 툴바 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          총 {questions.length}개 질문
        </p>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          새 질문
        </button>
      </div>

      {/* 질문 그룹 */}
      {groupedQuestions.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">
            아직 등록된 질문이 없어요
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            자기소개서 질문을 추가하고 답변을 작성해보세요.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            첫 질문 추가하기
          </button>
        </div>
      ) : (
        groupedQuestions.map(group => (
          <div key={group.jobId ?? '__none__'} className="space-y-2">
            {/* 그룹 헤더 */}
            <div className="flex items-center gap-2 px-1">
              {group.jobId ? (
                <Building2 className="w-4 h-4 text-blue-500" />
              ) : (
                <Unlink className="w-4 h-4 text-gray-400" />
              )}
              <h3 className={`text-sm font-semibold ${group.jobId ? 'text-gray-800' : 'text-gray-500'}`}>
                {group.jobLabel}
              </h3>
              <span className="text-xs text-gray-400">({group.questions.length})</span>
            </div>

            {/* 질문 목록 */}
            <div className="space-y-2">
              {group.questions.map(question => (
                <CoverLetterQuestionRow
                  key={question.id}
                  question={question}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* 추가 모달 */}
      <AddQuestionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleCreate}
        user={user}
      />
    </div>
  )
}
