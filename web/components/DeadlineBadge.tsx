'use client'

interface DeadlineBadgeProps {
  deadline?: string | null
  deadlineType?: string | null
}

export function DeadlineBadge({ deadline, deadlineType }: DeadlineBadgeProps) {
  // 상시채용
  if (deadlineType === '상시채용' || deadlineType === '채용시마감') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
        🟢 {deadlineType === '채용시마감' ? '채용시마감' : '상시채용'}
      </span>
    )
  }

  if (!deadline) {
    return null
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadlineDate = new Date(deadline)
  deadlineDate.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  // 마감됨
  if (diffDays < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
        마감됨
      </span>
    )
  }

  // D-day
  if (diffDays === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-300 animate-pulse">
        🔴 D-Day
      </span>
    )
  }

  // D-3 이하: 빨간색
  if (diffDays <= 3) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-300">
        🔴 D-{diffDays}
      </span>
    )
  }

  // D-7 이하: 노란색
  if (diffDays <= 7) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-300">
        🟡 D-{diffDays}
      </span>
    )
  }

  // 그 외
  const formatted = deadlineDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
      📅 {formatted} (D-{diffDays})
    </span>
  )
}

/**
 * 마감일 기준 정렬용 숫자 반환
 * 마감 임박 = 작은 숫자 (먼저), 상시채용 = 큰 숫자 (나중에)
 */
export function getDeadlineSortValue(deadline?: string | null, deadlineType?: string | null): number {
  if (deadlineType === '상시채용' || deadlineType === '채용시마감') {
    return 999999 // 맨 뒤
  }
  if (!deadline) return 999998

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(deadline)
  d.setHours(0, 0, 0, 0)
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  // 마감된 건은 맨 뒤 (상시채용 앞)
  if (diff < 0) return 999000 + Math.abs(diff)
  return diff
}
