'use client'

import { useMemo } from 'react'
import { ApplicationWithJob } from '@/types/application'

interface WeeklyTimelineProps {
  applications: ApplicationWithJob[]
  selectedDate?: string | null
  onDayClick?: (date: string) => void
}

function getWeekDays(): Date[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(d)
  }
  return days
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function WeeklyTimeline({ applications, selectedDate, onDayClick }: WeeklyTimelineProps) {
  const weekDays = useMemo(() => getWeekDays(), [])
  const today = useMemo(() => toLocalDateKey(new Date()), [])

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

  const hasAnyDeadline = weekDays.some((d) => (deadlinesByDay[toLocalDateKey(d)] || 0) > 0)
  if (!hasAnyDeadline && applications.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-gray-500">이번 주 마감</span>
      </div>
      <div className="flex items-end gap-1 sm:gap-2">
        {weekDays.map((day, i) => {
          const key = toLocalDateKey(day)
          const count = deadlinesByDay[key] || 0
          const isToday = key === today
          const isSelected = key === selectedDate

          const now = new Date()
          now.setHours(0, 0, 0, 0)
          const diff = Math.ceil((day.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          let countColor = 'text-gray-300'
          let countBg = ''
          if (count > 0) {
            if (diff < 0) { countColor = 'text-gray-400'; countBg = 'bg-gray-100' }
            else if (diff <= 3) { countColor = 'text-red-600'; countBg = 'bg-red-50' }
            else { countColor = 'text-yellow-600'; countBg = 'bg-yellow-50' }
          }

          return (
            <button
              key={i}
              onClick={() => onDayClick?.(key)}
              className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg transition-colors ${
                isSelected
                  ? 'bg-blue-100 ring-2 ring-blue-400'
                  : isToday
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50'
              }`}
            >
              <span className={`text-[10px] sm:text-xs ${isToday ? 'font-bold text-blue-600' : 'text-gray-400'}`}>
                {DAY_LABELS[i]}
              </span>
              <span className={`text-xs sm:text-sm ${isToday ? 'font-bold text-blue-700' : 'text-gray-700'}`}>
                {day.getDate()}
              </span>
              <div className="min-h-[18px] flex items-center justify-center">
                {count > 0 ? (
                  <span className={`text-[10px] sm:text-xs font-bold rounded-full px-1.5 ${countColor} ${countBg}`}>
                    {count}
                  </span>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
