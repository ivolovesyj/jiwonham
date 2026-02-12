'use client'

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ApplicationWithJob } from '@/types/application'
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react'

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
const MONTH_DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMonthCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const startDow = firstDay.getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (Date | null)[] = []
  // 이전 달 빈칸
  for (let i = 0; i < startDow; i++) {
    cells.push(null)
  }
  // 이번 달
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d))
  }
  return cells
}

function MonthlyCalendarModal({
  applications,
  selectedDate,
  onDayClick,
  onClose,
}: {
  applications: ApplicationWithJob[]
  selectedDate?: string | null
  onDayClick?: (date: string) => void
  onClose: () => void
}) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const todayKey = toLocalDateKey(today)

  const deadlinesByDay = useMemo(() => {
    const map: Record<string, ApplicationWithJob[]> = {}
    for (const app of applications) {
      const deadline = app.saved_job.external_deadline || app.saved_job.deadline
      if (!deadline) continue
      if (['rejected', 'accepted', 'declined', 'passed'].includes(app.status)) continue
      const key = deadline.split('T')[0]
      if (!map[key]) map[key] = []
      map[key].push(app)
    }
    return map
  }, [applications])

  const calendarDays = useMemo(() => getMonthCalendarDays(viewYear, viewMonth), [viewYear, viewMonth])

  const goToPrev = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
    else setViewMonth(viewMonth - 1)
  }
  const goToNext = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
    else setViewMonth(viewMonth + 1)
  }
  const goToToday = () => {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[520px] max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button onClick={goToPrev} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-bold text-gray-900 min-w-[100px] text-center">
              {viewYear}년 {viewMonth + 1}월
            </span>
            <button onClick={goToNext} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={goToToday}
              className="ml-1 px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              오늘
            </button>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 px-3 pt-3">
          {MONTH_DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className={`text-center text-[11px] font-semibold py-1 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* 달력 그리드 */}
        <div className="grid grid-cols-7 px-3 pb-4 gap-y-0.5">
          {calendarDays.map((day, i) => {
            if (!day) {
              return <div key={`empty-${i}`} className="min-h-[56px]" />
            }

            const key = toLocalDateKey(day)
            const apps = deadlinesByDay[key] || []
            const count = apps.length
            const isToday = key === todayKey
            const isSelected = key === selectedDate
            const dow = day.getDay()

            const now = new Date()
            now.setHours(0, 0, 0, 0)
            const diff = Math.ceil((day.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

            let countColor = ''
            let countBg = ''
            if (count > 0) {
              if (diff < 0) { countColor = 'text-gray-400'; countBg = 'bg-gray-100' }
              else if (diff <= 3) { countColor = 'text-red-600'; countBg = 'bg-red-50' }
              else if (diff <= 7) { countColor = 'text-yellow-600'; countBg = 'bg-yellow-50' }
              else { countColor = 'text-blue-600'; countBg = 'bg-blue-50' }
            }

            return (
              <button
                key={key}
                onClick={() => {
                  onDayClick?.(key)
                  if (count > 0) onClose()
                }}
                className={`min-h-[56px] flex flex-col items-center py-1.5 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-blue-100 ring-2 ring-blue-400'
                    : isToday
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-50'
                }`}
              >
                <span
                  className={`text-xs leading-tight ${
                    isToday
                      ? 'font-bold text-white bg-blue-600 rounded-full w-5 h-5 flex items-center justify-center'
                      : dow === 0
                        ? 'text-red-400'
                        : dow === 6
                          ? 'text-blue-400'
                          : 'text-gray-700'
                  }`}
                >
                  {day.getDate()}
                </span>
                {count > 0 && (
                  <span className={`text-[10px] font-bold rounded-full px-1.5 mt-1 ${countColor} ${countBg}`}>
                    {count}
                  </span>
                )}
                {count > 0 && (
                  <div className="mt-0.5 max-w-full px-0.5">
                    {apps.slice(0, 2).map((app) => (
                      <div
                        key={app.id}
                        className="text-[9px] text-gray-500 truncate leading-tight max-w-[60px]"
                        title={app.saved_job.external_company || app.saved_job.company || ''}
                      >
                        {app.saved_job.external_company || app.saved_job.company || ''}
                      </div>
                    ))}
                    {count > 2 && (
                      <div className="text-[9px] text-gray-400">+{count - 2}</div>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}

export function WeeklyTimeline({ applications, selectedDate, onDayClick }: WeeklyTimelineProps) {
  const [showMonthly, setShowMonthly] = useState(false)
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
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-gray-500">이번 주 마감</span>
          <button
            onClick={() => setShowMonthly(true)}
            className="ml-auto p-1 hover:bg-gray-100 rounded-md transition-colors"
            title="월간 달력 보기"
          >
            <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
          </button>
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

      {showMonthly && (
        <MonthlyCalendarModal
          applications={applications}
          selectedDate={selectedDate}
          onDayClick={onDayClick}
          onClose={() => setShowMonthly(false)}
        />
      )}
    </>
  )
}
