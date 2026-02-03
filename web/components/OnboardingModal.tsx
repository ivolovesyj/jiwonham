'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

const CAREER_OPTIONS = [
  { value: '신입', label: '신입 (0년)' },
  { value: '1-3', label: '1~3년' },
  { value: '3-5', label: '3~5년' },
  { value: '5-10', label: '5~10년' },
  { value: '10+', label: '10년 이상' },
  { value: '경력무관', label: '경력무관' },
]

export function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [selectedCareer, setSelectedCareer] = useState('경력무관')
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedEmployeeTypes, setSelectedEmployeeTypes] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // 간단한 직무/지역 옵션 (실제로는 API에서 가져와야 함)
  const jobOptions = ['프론트엔드', '백엔드', 'DevOps', 'iOS', 'Android', '데이터']
  const locationOptions = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '세종']
  const employeeTypeOptions = ['정규직', '계약직', '인턴', '프리랜서']

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item])
  }

  const handleSave = async () => {
    if (!user || selectedJobs.length === 0) return

    setSaving(true)
    try {
      await supabase.from('user_preferences').upsert({
        user_id: user.id,
        preferred_job_types: selectedJobs,
        preferred_locations: selectedLocations.length > 0 ? selectedLocations : ['서울'],
        career_level: selectedCareer,
        work_style: selectedEmployeeTypes.length > 0 ? selectedEmployeeTypes : ['정규직'],
      })

      onComplete()
    } catch (error) {
      console.error('Failed to save preferences:', error)
      alert('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    if (!user) return

    // 기본값으로 저장
    try {
      await supabase.from('user_preferences').upsert({
        user_id: user.id,
        preferred_job_types: ['프론트엔드'],
        preferred_locations: ['서울'],
        career_level: '경력무관',
        work_style: ['정규직'],
      })
      onComplete()
    } catch (error) {
      console.error('Failed to save default preferences:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">선호 조건 설정</h2>
              <p className="text-sm text-gray-600 mt-1">
                Step {step}/4 - 더 정확한 공고를 추천해드려요
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step 1: 직무 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">관심있는 직무를 선택해주세요</h3>
                <p className="text-sm text-gray-600 mb-4">여러 개 선택 가능합니다</p>
                <div className="flex flex-wrap gap-2">
                  {jobOptions.map(job => (
                    <button
                      key={job}
                      onClick={() => toggle(selectedJobs, setSelectedJobs, job)}
                      className={`px-4 py-2 rounded-full border transition ${
                        selectedJobs.includes(job)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {job}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: 경력 */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">경력을 선택해주세요</h3>
                <div className="flex flex-wrap gap-2">
                  {CAREER_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedCareer(option.value)}
                      className={`px-4 py-2 rounded-full border transition ${
                        selectedCareer === option.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: 지역 */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">희망 근무 지역을 선택해주세요</h3>
                <p className="text-sm text-gray-600 mb-4">여러 개 선택 가능합니다</p>
                <div className="flex flex-wrap gap-2">
                  {locationOptions.map(loc => (
                    <button
                      key={loc}
                      onClick={() => toggle(selectedLocations, setSelectedLocations, loc)}
                      className={`px-4 py-2 rounded-full border transition ${
                        selectedLocations.includes(loc)
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: 고용형태 */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">희망 고용형태를 선택해주세요</h3>
                <p className="text-sm text-gray-600 mb-4">여러 개 선택 가능합니다</p>
                <div className="flex flex-wrap gap-2">
                  {employeeTypeOptions.map(type => (
                    <button
                      key={type}
                      onClick={() => toggle(selectedEmployeeTypes, setSelectedEmployeeTypes, type)}
                      className={`px-4 py-2 rounded-full border transition ${
                        selectedEmployeeTypes.includes(type)
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <div className="flex gap-2">
              {step > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(step - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  이전
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-gray-500"
              >
                건너뛰기
              </Button>
            </div>

            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && selectedJobs.length === 0}
              >
                다음
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saving || selectedJobs.length === 0}
              >
                {saving ? '저장 중...' : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    완료
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
