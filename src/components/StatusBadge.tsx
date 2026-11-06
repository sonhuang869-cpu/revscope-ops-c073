import { cn } from '../lib/utils'
import type { ContractStatus, POStatus, MilestoneStatus, RecognitionMethod, POType } from '../types'

type AnyStatus = ContractStatus | POStatus | MilestoneStatus | RecognitionMethod | POType | string

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  // Contract statuses
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: 'Completed', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  terminated: { label: 'Terminated', className: 'bg-red-50 text-red-700 border-red-200' },

  // PO statuses
  not_started: { label: 'Not Started', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  in_progress: { label: 'In Progress', className: 'bg-amber-50 text-amber-700 border-amber-200' },

  // Milestone statuses
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-600 border-slate-200' },

  // Recognition methods
  ratable: { label: 'Ratable', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  milestone: { label: 'Milestone', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  point_in_time: { label: 'Point-in-Time', className: 'bg-pink-50 text-pink-700 border-pink-200' },

  // PO types
  saas_license: { label: 'SaaS License', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  professional_services: { label: 'Prof. Services', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  support: { label: 'Support', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  training: { label: 'Training', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  implementation: { label: 'Implementation', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  other: { label: 'Other', className: 'bg-slate-100 text-slate-600 border-slate-200' },
}

interface StatusBadgeProps {
  status: AnyStatus
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status] ?? {
    label: status,
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
