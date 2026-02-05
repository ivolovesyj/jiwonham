'use client'

import { useState, useRef, useEffect } from 'react'
import { ApplicationStatus } from '@/types/application'
import { ChevronDown } from 'lucide-react'

interface StatusBadgeProps {
  status: ApplicationStatus
  editable?: boolean
  onStatusChange?: (newStatus: ApplicationStatus) => void
}

const statusConfig: Record<
  ApplicationStatus,
  { label: string; className: string }
> = {
  passed: {
    label: '지원안함',
    className: 'bg-gray-50 text-gray-400 border-gray-200',
  },
  pending: {
    label: '지원 예정',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  hold: {
    label: '보류',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  },
  not_applying: {
    label: '미지원',
    className: 'bg-gray-400 text-gray-700 border-gray-500',
  },
  applied: {
    label: '지원 완료',
    className: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  document_pass: {
    label: '서류 합격',
    className: 'bg-green-100 text-green-700 border-green-300',
  },
  interviewing: {
    label: '면접 중',
    className: 'bg-purple-100 text-purple-700 border-purple-300',
  },
  final: {
    label: '최종 면접',
    className: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  },
  rejected: {
    label: '불합격',
    className: 'bg-red-100 text-red-700 border-red-300',
  },
  accepted: {
    label: '합격',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  },
  declined: {
    label: '제안 거절',
    className: 'bg-orange-100 text-orange-700 border-orange-300',
  },
}

const STATUS_ORDER: ApplicationStatus[] = [
  'pending',
  'hold',
  'applied',
  'document_pass',
  'interviewing',
  'final',
  'accepted',
  'rejected',
  'not_applying',
  'passed',
]

export function StatusBadge({ status, editable, onStatusChange }: StatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const config = statusConfig[status]

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // 편집 불가능한 경우 기존 배지만 표시
  if (!editable || !onStatusChange) {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
      >
        {config.label}
      </span>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity ${config.className}`}
      >
        {config.label}
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px] py-1">
          {STATUS_ORDER.map((s) => {
            const cfg = statusConfig[s]
            const isSelected = s === status
            return (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation()
                  if (s !== status) {
                    onStatusChange(s)
                  }
                  setIsOpen(false)
                }}
                className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center gap-2 ${
                  isSelected ? 'bg-gray-50 font-medium' : ''
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cfg.className.split(' ')[0]}`} />
                {cfg.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
