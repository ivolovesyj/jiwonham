'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { useMotionValue, useSpring, motion } from 'framer-motion'
import { ApplicationWithJob, ApplicationStatus } from '@/types/application'
import { Briefcase, TrendingUp, Trophy, AlertTriangle } from 'lucide-react'

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { stiffness: 100, damping: 20 })

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  useEffect(() => {
    const unsubscribe = spring.on('change', (v) => {
      setDisplay(Math.round(v))
    })
    return unsubscribe
  }, [spring])

  return <>{display}</>
}

interface StatsWidgetProps {
  applications: ApplicationWithJob[]
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#D1D5DB',
  hold: '#FDE68A',
  not_applying: '#9CA3AF',
  passed: '#E5E7EB',
  applied: '#93C5FD',
  document_pass: '#6EE7B7',
  interviewing: '#C4B5FD',
  final: '#A5B4FC',
  rejected: '#FCA5A5',
  accepted: '#6EE7B7',
  declined: '#FDBA74',
}

const STATUS_LABELS: Record<string, string> = {
  pending: '예정',
  hold: '보류',
  applied: '지원완료',
  document_pass: '서류합격',
  interviewing: '면접중',
  final: '최종',
  accepted: '합격',
  rejected: '불합격',
  not_applying: '미지원',
  passed: '지원안함',
  declined: '거절',
}

export function StatsWidget({ applications }: StatsWidgetProps) {
  const stats = useMemo(() => {
    const total = applications.length
    const inProgress = applications.filter((a) =>
      ['pending', 'applied', 'document_pass', 'interviewing', 'final'].includes(a.status)
    ).length
    const accepted = applications.filter((a) => a.status === 'accepted').length
    const applied = applications.filter((a) =>
      ['applied', 'document_pass', 'interviewing', 'final', 'accepted', 'rejected'].includes(a.status)
    ).length
    const acceptRate = applied > 0 ? Math.round((accepted / applied) * 100) : 0

    // 마감 임박 (3일 이내)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const urgent = applications.filter((a) => {
      const deadline = a.saved_job.external_deadline || a.saved_job.deadline
      if (!deadline) return false
      if (['rejected', 'accepted', 'declined', 'passed'].includes(a.status)) return false
      const d = new Date(deadline)
      d.setHours(0, 0, 0, 0)
      const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return diff >= 0 && diff <= 3
    }).length

    // 상태별 분포
    const distribution: { status: string; count: number; color: string }[] = []
    const counts: Record<string, number> = {}
    for (const a of applications) {
      counts[a.status] = (counts[a.status] || 0) + 1
    }
    for (const [status, count] of Object.entries(counts)) {
      distribution.push({ status, count, color: STATUS_COLORS[status] || '#D1D5DB' })
    }

    return { total, inProgress, acceptRate, urgent, distribution }
  }, [applications])

  if (applications.length === 0) return null

  const cards = [
    { icon: Briefcase, label: '전체 지원', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: TrendingUp, label: '진행중', value: stats.inProgress, color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: Trophy, label: '합격률', value: `${stats.acceptRate}%`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: AlertTriangle, label: '마감임박', value: stats.urgent, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  return (
    <div className="mb-4">
      {/* 4-card grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 flex items-center gap-3"
          >
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${card.bg} flex items-center justify-center flex-shrink-0`}>
              <card.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${card.color}`} />
            </div>
            <div className="min-w-0">
              <div className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                {typeof card.value === 'number' ? (
                  <AnimatedNumber value={card.value} />
                ) : (
                  card.value
                )}
              </div>
              <div className="text-xs text-gray-500 truncate">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Status distribution bar */}
      {stats.distribution.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4">
          <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
            {stats.distribution.map((d) => (
              <div
                key={d.status}
                style={{
                  width: `${(d.count / stats.total) * 100}%`,
                  backgroundColor: d.color,
                }}
                title={`${STATUS_LABELS[d.status] || d.status}: ${d.count}건`}
                className="transition-all duration-300"
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {stats.distribution.map((d) => (
              <div key={d.status} className="flex items-center gap-1 text-[11px] text-gray-500">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                {STATUS_LABELS[d.status] || d.status} {d.count}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
