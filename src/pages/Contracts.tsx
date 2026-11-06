import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, ArrowRight, Filter, Plus } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { getContracts, getObligations } from '../lib/storage'
import { formatCurrency } from '../lib/calculations'
import { formatDate, cn } from '../lib/utils'
import type { ContractStatus } from '../types'

const STATUS_FILTERS: Array<{ value: ContractStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Completed' },
  { value: 'terminated', label: 'Terminated' },
]

export default function Contracts() {
  const contracts = getContracts()
  const obligations = getObligations()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all')

  const filtered = useMemo(() => {
    return contracts
      .filter((c) => {
        if (statusFilter !== 'all' && c.status !== statusFilter) return false
        if (search) {
          const q = search.toLowerCase()
          return (
            c.customer.toLowerCase().includes(q) ||
            c.contractNumber.toLowerCase().includes(q) ||
            c.industry.toLowerCase().includes(q)
          )
        }
        return true
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [contracts, search, statusFilter])

  const totalTCV = filtered.reduce((s, c) => s + c.totalContractValue, 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Contracts</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} contract{filtered.length !== 1 ? 's' : ''} ·{' '}
            <span className="num">{formatCurrency(totalTCV)}</span> total contract value
          </p>
        </div>
        <Link to="/contracts/new" className="btn-primary self-start">
          <Plus className="w-4 h-4" />
          New Contract
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search customer, contract number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                statusFilter === f.value
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="table-th">Contract #</th>
                <th className="table-th">Customer</th>
                <th className="table-th hidden md:table-cell">Industry</th>
                <th className="table-th hidden sm:table-cell">Term</th>
                <th className="table-th hidden lg:table-cell">POs</th>
                <th className="table-th text-right">TCV</th>
                <th className="table-th">Status</th>
                <th className="table-th sr-only">Open</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                    No contracts match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const poCount = obligations.filter((po) => po.contractId === c.id).length
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="table-td">
                        <span className="font-mono text-xs text-slate-500">{c.contractNumber}</span>
                      </td>
                      <td className="table-td">
                        <div className="font-medium text-slate-900">{c.customer}</div>
                        {c.salesOwner && (
                          <div className="text-xs text-slate-400">{c.salesOwner}</div>
                        )}
                      </td>
                      <td className="table-td hidden md:table-cell text-slate-500 text-xs">
                        {c.industry}
                      </td>
                      <td className="table-td hidden sm:table-cell text-xs text-slate-500">
                        <div className="num">{formatDate(c.startDate)}</div>
                        <div className="num text-slate-400">{formatDate(c.endDate)}</div>
                      </td>
                      <td className="table-td hidden lg:table-cell">
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          {poCount} PO{poCount !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="table-td text-right num font-semibold text-slate-700">
                        {formatCurrency(c.totalContractValue)}
                      </td>
                      <td className="table-td">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="table-td">
                        <Link
                          to={`/contracts/${c.id}`}
                          className="btn-ghost py-1.5 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary row */}
      {filtered.length > 0 && (
        <div className="text-xs text-slate-500 px-1">
          Showing {filtered.length} of {contracts.length} contracts · Total TCV:{' '}
          <span className="font-semibold text-slate-700 num">{formatCurrency(totalTCV)}</span>
        </div>
      )}
    </div>
  )
}
