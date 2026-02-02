import { ApplicationStatus } from '@/types/application'

interface StatusBadgeProps {
  status: ApplicationStatus
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

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  )
}
