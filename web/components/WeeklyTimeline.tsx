'use client'

import { useMemo } from 'react'
import { ApplicationWithJob } from '@/types/application'

interface WeeklyTimelineProps {
  applications: ApplicationWithJob[]
  onDayClick?: (date: string) => void
}

function getWeekDays(): Date[] {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(d)
  }
  return days
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

function formatDateKey(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function WeeklyTimeline({ applications, onDayClick }: WeeklyTimelineProps) {
  const weekDays = useMemo(() => getWeekDays(), [])
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return formatDateKey(d)
  }, [])

  const deadlinesByDay = useMemo(() => {
    const map: Record<string, number> = {}
    for (const app of applications) {
      const deadline = app.saved_job.external_deadline || app.saved_job.deadline
      if (!deadline) continue
      if (['rejected', 'accepted', 'declined', 'passed'].includes(app.status)) continue
      const key = deadline.split('T')[0]
      map[key] = (map[key] || 0) + 1
    }
    return map
  }, [applications])

  // Check if there's anything to show this week
  const hasAnyDeadline = weekDays.some((d) => (deadlinesByDay[formatDateKey(d)] || 0) > 0)
  if (!hasAnyDeadline && applications.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-gray-500">이번 주 마감</span>
      </div>
      <div className="flex items-end gap-1 sm:gap-2">
        {weekDays.map((day, i) => {
          const key = formatDateKey(day)
          const count = deadlinesByDay[key] || 0
          const isToday = key === today

          // Color logic
          const now = new Date()
          now.setHours(0, 0, 0, 0)
          const diff = Math.ceil((day.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          let dotColor = 'bg-gray-300'
          if (count > 0) {
            if (diff < 0) dotColor = 'bg-gray-400'
            else if (diff <= 3) dotColor = 'bg-red-400'
            else dotColor = 'bg-yellow-400'
          }

          return (
            <button
              key={i}
              onClick={() => onDayClick?.(key)}
              className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg transition-colors ${
                isToday ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <span className={`text-[10px] sm:text-xs ${isToday ? 'font-bold text-blue-600' : 'text-gray-400'}`}>
                {DAY_LABELS[i]}
              </span>
              <span className={`text-xs sm:text-sm ${isToday ? 'font-bold text-blue-700' : 'text-gray-700'}`}>
                {day.getDate()}
              </span>
              <div className="flex gap-0.5 min-h-[8px]">
                {count > 0 && Array.from({ length: Math.min(count, 4) }).map((_, j) => (
                  <div key={j} className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
