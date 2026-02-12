'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDraggable,
  useDroppable,
  rectIntersection,
} from '@dnd-kit/core'
import { ApplicationWithJob, ApplicationStatus } from '@/types/application'
import { statusConfig } from './StatusBadge'
import { CompanyLogo } from './CompanyLogo'
import { DeadlineBadge } from './DeadlineBadge'

interface KanbanBoardProps {
  applications: ApplicationWithJob[]
  onStatusChange: (applicationId: string, newStatus: ApplicationStatus) => void
}

const KANBAN_COLUMNS: ApplicationStatus[] = [
  'pending',
  'applied',
  'document_pass',
  'interviewing',
  'final',
  'accepted',
  'rejected',
]

const COLUMN_DOT_COLORS: Record<string, string> = {
  pending: 'bg-gray-400',
  hold: 'bg-yellow-400',
  not_applying: 'bg-gray-500',
  passed: 'bg-gray-300',
  applied: 'bg-blue-400',
  document_pass: 'bg-green-400',
  interviewing: 'bg-purple-400',
  final: 'bg-indigo-400',
  rejected: 'bg-red-400',
  accepted: 'bg-emerald-500',
  declined: 'bg-orange-400',
}

function KanbanCard({ application, isDragging }: { application: ApplicationWithJob; isDragging?: boolean }) {
  const company = application.saved_job.external_company || application.saved_job.company || '회사명 없음'
  const title = application.saved_job.external_title || application.saved_job.title || '직무명 없음'
  const deadline = application.saved_job.external_deadline || application.saved_job.deadline

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-lg opacity-90 ring-2 ring-blue-400' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <CompanyLogo
          companyName={company}
          imageUrl={application.saved_job.company_image}
          size={20}
        />
        <span className="text-xs font-bold text-gray-900 truncate">{company}</span>
      </div>
      <div className="text-xs text-gray-600 truncate mb-2">{title}</div>
      {deadline && (
        <div className="flex justify-end">
          <DeadlineBadge deadline={deadline} />
        </div>
      )}
    </div>
  )
}

function DraggableKanbanCard({ application }: { application: ApplicationWithJob }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: application.id })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.4 : 1 }
    : undefined

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      transition={{ duration: 0.15 }}
    >
      <KanbanCard application={application} />
    </motion.div>
  )
}

function DroppableColumn({
  status,
  applications,
  isOver,
}: {
  status: ApplicationStatus
  applications: ApplicationWithJob[]
  isOver?: boolean
}) {
  const config = statusConfig[status]
  const { setNodeRef } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[250px] bg-gray-50 rounded-xl border border-gray-200 flex flex-col min-h-[400px] transition-colors ${
        isOver ? 'bg-blue-50 border-blue-300' : ''
      }`}
    >
      <div className="p-3 border-b border-gray-200 flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${COLUMN_DOT_COLORS[status] || 'bg-gray-400'}`} />
        <span className="text-sm font-semibold text-gray-700">{config.label}</span>
        <span className="ml-auto text-xs text-gray-400 font-medium">{applications.length}</span>
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {applications.map((app) => (
          <DraggableKanbanCard key={app.id} application={app} />
        ))}
        {applications.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-8">
            여기로 드래그
          </div>
        )}
      </div>
    </div>
  )
}

export function KanbanBoard({ applications, onStatusChange }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overColumnId, setOverColumnId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const columns = useMemo(() => {
    const groups: Record<string, ApplicationWithJob[]> = {}
    for (const col of KANBAN_COLUMNS) {
      groups[col] = []
    }
    for (const app of applications) {
      if (groups[app.status]) {
        groups[app.status].push(app)
      } else {
        groups['pending']?.push(app)
      }
    }
    return groups
  }, [applications])

  const visibleColumns = useMemo(() => {
    return KANBAN_COLUMNS.filter((col) => {
      const hasItems = (columns[col]?.length || 0) > 0
      const isDefault = ['pending', 'applied', 'document_pass', 'interviewing', 'accepted', 'rejected'].includes(col)
      return hasItems || isDefault
    })
  }, [columns])

  const activeApp = useMemo(() => {
    if (!activeId) return null
    return applications.find((a) => a.id === activeId) || null
  }, [activeId, applications])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverColumnId(null)

    if (!over) return

    const activeAppId = active.id as string
    const targetStatus = over.id as string

    // Verify it's a valid column
    if (!KANBAN_COLUMNS.includes(targetStatus as ApplicationStatus)) return

    const app = applications.find((a) => a.id === activeAppId)
    if (!app || app.status === targetStatus) return

    onStatusChange(activeAppId, targetStatus as ApplicationStatus)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={(event) => {
        const overId = event.over?.id as string | undefined
        if (overId && KANBAN_COLUMNS.includes(overId as ApplicationStatus)) {
          setOverColumnId(overId)
        } else {
          setOverColumnId(null)
        }
      }}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto pb-4 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6">
        <div className="flex gap-3 min-w-max">
          {visibleColumns.map((status) => (
            <DroppableColumn
              key={status}
              status={status}
              applications={columns[status] || []}
              isOver={overColumnId === status}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeApp ? (
          <div className="w-[250px]">
            <KanbanCard application={activeApp} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
