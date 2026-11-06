import { cn } from '../lib/utils'
import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: string
  subValue?: string
  subLabel?: string
  icon: ReactNode
  iconBg?: string
  trend?: { value: string; positive: boolean }
  className?: string
}

export default function MetricCard({
  label,
  value,
  subValue,
  subLabel,
  icon,
  iconBg = 'bg-emerald-50',
  trend,
  className,
}: MetricCardProps) {
  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            {label}
          </div>
          <div className="text-2xl font-bold text-slate-900 num tracking-tight">{value}</div>
          {subValue && (
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-sm font-medium text-slate-500 num">{subValue}</span>
              {subLabel && (
                <span className="text-xs text-slate-400">{subLabel}</span>
              )}
            </div>
          )}
          {trend && (
            <div
              className={cn(
                'mt-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                trend.positive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              )}
            >
              <span>{trend.positive ? '↑' : '↓'}</span>
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        <div className={cn('p-2.5 rounded-xl flex-shrink-0', iconBg)}>
          {icon}
        </div>
      </div>
    </div>
  )
}
