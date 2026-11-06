import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  CalendarDays,
  Settings,
  RefreshCw,
  TrendingUp,
  X,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { resetDemo } from '../lib/storage'
import { toast } from 'sonner'

interface SidebarProps {
  onClose?: () => void
}

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/contracts', label: 'Contracts', icon: FileText, end: false },
  { to: '/schedule', label: 'Revenue Schedule', icon: CalendarDays, end: false },
]

export default function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation()

  function handleReset() {
    resetDemo()
    toast.success('Demo data has been reset')
    window.location.reload()
  }

  return (
    <aside className="flex flex-col h-full bg-[#0a1628] select-none">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-white font-bold text-base tracking-tight leading-none">
              RevScope
            </div>
            <div className="text-slate-500 text-[10px] font-medium mt-0.5 tracking-wide uppercase">
              ASC 606 Platform
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-3">
          Revenue Ops
        </div>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'sidebar-link',
                isActive && 'active'
              )
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mt-6 mb-3">
          Settings
        </div>
        <button
          onClick={handleReset}
          className="sidebar-link w-full text-left"
          title="Restore all demo data to its original state"
        >
          <RefreshCw className="w-4 h-4 flex-shrink-0" />
          Reset Demo Data
        </button>
        <div className="sidebar-link cursor-default opacity-60">
          <Settings className="w-4 h-4 flex-shrink-0" />
          Configuration
          <span className="ml-auto text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
            Soon
          </span>
        </div>
      </nav>

      {/* User / build info */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-900 border border-emerald-700 flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-400 text-xs font-bold">HR</span>
          </div>
          <div className="min-w-0">
            <div className="text-white text-sm font-medium truncate">Harry Randhawa</div>
            <div className="text-slate-500 text-xs truncate">Senior Finance Executive</div>
          </div>
        </div>
        <div className="mt-3 px-2 py-1.5 bg-white/5 rounded-md">
          <div className="text-[10px] text-slate-500 text-center">
            ASC 606 / IFRS 15 Compliant
          </div>
        </div>
      </div>
    </aside>
  )
}
