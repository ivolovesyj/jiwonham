'use client'

import { useMemo, useEffect, useState } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'
import { ApplicationWithJob } from '@/types/application'
import { Briefcase, TrendingUp, AlertTriangle } from 'lucide-react'

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

export function StatsWidget({ applications }: StatsWidgetProps) {
  const stats = useMemo(() => {
    const total = applications.length
    const inProgress = applications.filter((a) =>
      ['pending', 'applied', 'document_pass', 'interviewing', 'final'].includes(a.status)
    ).length

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

    return { total, inProgress, urgent }
  }, [applications])

  if (applications.length === 0) return null

  const cards = [
    { icon: Briefcase, label: '전체 지원', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: TrendingUp, label: '진행중', value: stats.inProgress, color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: AlertTriangle, label: '마감임박', value: stats.urgent, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  return (
    <div className="mb-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
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
                <AnimatedNumber value={card.value} />
              </div>
              <div className="text-xs text-gray-500 truncate">{card.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
