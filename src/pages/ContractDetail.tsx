import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  FileText,
  Calculator,
  CalendarDays,
  Trash2,
  CheckCircle2,
  Clock,
  CircleDot,
  Info,
  Building2,
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import {
  getContractById,
  getObligationsByContractId,
  deleteContract,
} from '../lib/storage'
import {
  calculateAllocation,
  generateScheduleForObligation,
  buildMonthSummaries,
  formatCurrency,
  formatPct,
} from '../lib/calculations'
import { formatDate, formatPeriod, cn } from '../lib/utils'
import { toast } from 'sonner'
import type { PerformanceObligation } from '../types'

type Tab = 'obligations' | 'allocation' | 'schedule'

const TABS: Array<{ id: Tab; label: string; icon: typeof FileText }> = [
  { id: 'obligations', label: 'Performance Obligations', icon: FileText },
  { id: 'allocation', label: 'Transaction Price Allocation', icon: Calculator },
  { id: 'schedule', label: 'Recognition Schedule', icon: CalendarDays },
]

function POTypeIcon({ type }: { type: PerformanceObligation['type'] }) {
  const cls = 'w-4 h-4'
  switch (type) {
    case 'saas_license': return <CircleDot className={cn(cls, 'text-sky-500')} />
    case 'support': return <CheckCircle2 className={cn(cls, 'text-emerald-500')} />
    case 'implementation':
    case 'professional_services': return <Building2 className={cn(cls, 'text-amber-500')} />
    default: return <CircleDot className={cn(cls, 'text-slate-400')} />
  }
}

function POStatusDot({ status }: { status: PerformanceObligation['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex w-2 h-2 rounded-full',
        status === 'completed' && 'bg-emerald-500',
        status === 'in_progress' && 'bg-amber-400',
        status === 'not_started' && 'bg-slate-300',
      )}
    />
  )
}

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('obligations')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const contract = id ? getContractById(id) : undefined
  const obligations = id ? getObligationsByContractId(id) : []

  const allocation = useMemo(() => {
    if (!contract) return null
    return calculateAllocation(contract, obligations)
  }, [contract, obligations])

  const allScheduleEntries = useMemo(() => {
    if (!contract || !allocation) return []
    return obligations.flatMap((po) => {
      const row = allocation.rows.find((r) => r.obligationId === po.id)
      if (!row) return []
      return generateScheduleForObligation(po, row.allocatedAmount)
    })
  }, [contract, obligations, allocation])

  const monthSummaries = useMemo(
    () => buildMonthSummaries(allScheduleEntries),
    [allScheduleEntries]
  )

  if (!contract) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500 mb-4">Contract not found.</p>
        <Link to="/contracts" className="btn-secondary">
          Back to Contracts
        </Link>
      </div>
    )
  }

  function handleDelete() {
    if (!id) return
    deleteContract(id)
    toast.success(`Contract ${contract!.contractNumber} deleted`)
    navigate('/contracts')
  }

  const totalRecognized = allScheduleEntries
    .filter((e) => e.period <= new Date().toISOString().slice(0, 7))
    .reduce((s, e) => s + e.recognizedAmount, 0)

  const deferredBalance = contract.totalContractValue - totalRecognized

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500">
        <Link to="/contracts" className="hover:text-slate-700">Contracts</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-900 font-medium">{contract.contractNumber}</span>
      </nav>

      {/* Contract header */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900">{contract.customer}</h1>
              <StatusBadge status={contract.status} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs text-slate-400">{contract.contractNumber}</span>
              {contract.opportunityId && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-400">{contract.opportunityId}</span>
                </>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="label">Contract Date</div>
                <div className="text-sm font-medium text-slate-700 num">
                  {formatDate(contract.contractDate)}
                </div>
              </div>
              <div>
                <div className="label">Start Date</div>
                <div className="text-sm font-medium text-slate-700 num">
                  {formatDate(contract.startDate)}
                </div>
              </div>
              <div>
                <div className="label">End Date</div>
                <div className="text-sm font-medium text-slate-700 num">
                  {formatDate(contract.endDate)}
                </div>
              </div>
              <div>
                <div className="label">Currency</div>
                <div className="text-sm font-medium text-slate-700">{contract.currency}</div>
              </div>
            </div>
          </div>

          {/* Value summary */}
          <div className="flex flex-row sm:flex-col gap-4 sm:gap-2 sm:items-end">
            <div className="text-right">
              <div className="label">Total Contract Value</div>
              <div className="text-2xl font-bold text-slate-900 num">
                {formatCurrency(contract.totalContractValue)}
              </div>
            </div>
            <div className="sm:text-right flex sm:block gap-4">
              <div>
                <div className="label text-emerald-600">Recognized</div>
                <div className="text-sm font-semibold text-emerald-700 num">
                  {formatCurrency(Math.min(totalRecognized, contract.totalContractValue))}
                </div>
              </div>
              <div>
                <div className="label text-amber-600">Deferred</div>
                <div className="text-sm font-semibold text-amber-700 num">
                  {formatCurrency(Math.max(0, deferredBalance))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {contract.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-500">{contract.notes}</p>
          </div>
        )}

        {/* Recognition progress bar */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Recognition progress</span>
            <span className="num">
              {formatPct(Math.min(1, totalRecognized / contract.totalContractValue))}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{
                width: `${Math.min(100, (totalRecognized / contract.totalContractValue) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {TABS.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              className={cn(
                'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2',
                tab === tabId
                  ? 'text-emerald-600 border-emerald-500 bg-emerald-50/50'
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Performance Obligations */}
        {tab === 'obligations' && (
          <div>
            <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
              <p className="text-xs text-slate-500">
                <strong className="text-slate-700">Step 2 of ASC 606:</strong> Each distinct good or
                service promised to the customer is a separate performance obligation.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-white">
                    <th className="table-th">#</th>
                    <th className="table-th">Obligation</th>
                    <th className="table-th">Type</th>
                    <th className="table-th">Recognition</th>
                    <th className="table-th">Term</th>
                    <th className="table-th text-right">SSP</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {obligations.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                      <td className="table-td text-xs text-slate-400 font-mono">{po.sequence}</td>
                      <td className="table-td">
                        <div className="flex items-start gap-2">
                          <POTypeIcon type={po.type} />
                          <div>
                            <div className="font-medium text-slate-900 text-sm">{po.name}</div>
                            {po.description && (
                              <div className="text-xs text-slate-400 mt-0.5 max-w-xs">
                                {po.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table-td">
                        <StatusBadge status={po.type} />
                      </td>
                      <td className="table-td">
                        <StatusBadge status={po.recognitionMethod} />
                        {po.milestones && po.milestones.length > 0 && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            {po.milestones.length} milestones
                          </div>
                        )}
                      </td>
                      <td className="table-td text-xs text-slate-500">
                        <div className="num">{formatDate(po.startDate)}</div>
                        {po.endDate && (
                          <div className="num text-slate-400">{formatDate(po.endDate)}</div>
                        )}
                      </td>
                      <td className="table-td text-right num font-semibold text-slate-700">
                        {formatCurrency(po.standaloneSellPrice)}
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-1.5">
                          <POStatusDot status={po.status} />
                          <StatusBadge status={po.status} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Total SSP
                    </td>
                    <td className="px-4 py-3 text-right num font-bold text-slate-800 text-sm">
                      {formatCurrency(allocation?.totalSSP ?? 0)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Milestone detail for milestone-based POs */}
            {obligations
              .filter((po) => po.recognitionMethod === 'milestone' && po.milestones?.length)
              .map((po) => {
                const alloc = allocation?.rows.find((r) => r.obligationId === po.id)
                return (
                  <div key={po.id} className="border-t border-slate-100 px-5 py-4">
                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
                      {po.name} — Milestones
                    </h3>
                    <div className="space-y-2">
                      {po.milestones!.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                        >
                          <div
                            className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                              m.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-slate-200 text-slate-500'
                            )}
                          >
                            {m.status === 'completed' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-700">{m.name}</div>
                            <div className="text-xs text-slate-400">
                              Target: {formatDate(m.targetDate)}
                              {m.completedDate && (
                                <> · Completed: {formatDate(m.completedDate)}</>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs text-slate-500">{m.percentage}%</div>
                            {alloc && (
                              <div className="text-sm font-semibold text-slate-700 num">
                                {formatCurrency(alloc.allocatedAmount * (m.percentage / 100))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        {/* Tab: Transaction Price Allocation */}
        {tab === 'allocation' && allocation && (
          <div>
            <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
              <p className="text-xs text-slate-500">
                <strong className="text-slate-700">Step 4 of ASC 606:</strong> Allocate the
                transaction price to each performance obligation based on relative standalone selling
                prices (SSPs). Total contract value of{' '}
                <strong className="text-slate-700 num">
                  {formatCurrency(contract.totalContractValue)}
                </strong>{' '}
                is distributed proportionally.
              </p>
            </div>

            {/* Allocation table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="bg-white border-b border-slate-100">
                    <th className="table-th">Performance Obligation</th>
                    <th className="table-th text-right">SSP</th>
                    <th className="table-th text-right">Relative SSP %</th>
                    <th className="table-th text-right">Allocated Amount</th>
                    <th className="table-th text-right">% of TCV</th>
                  </tr>
                </thead>
                <tbody>
                  {allocation.rows.map((row) => (
                    <tr key={row.obligationId} className="hover:bg-slate-50 transition-colors">
                      <td className="table-td font-medium text-slate-900">{row.obligationName}</td>
                      <td className="table-td text-right num text-slate-700">
                        {formatCurrency(row.standaloneSellPrice)}
                      </td>
                      <td className="table-td text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className="h-full bg-indigo-400 rounded-full"
                              style={{ width: `${row.allocationPct * 100}%` }}
                            />
                          </div>
                          <span className="num text-slate-700">{formatPct(row.allocationPct)}</span>
                        </div>
                      </td>
                      <td className="table-td text-right num font-semibold text-slate-900">
                        {formatCurrency(row.allocatedAmount)}
                      </td>
                      <td className="table-td text-right num text-slate-500">
                        {formatPct(row.allocatedAmount / contract.totalContractValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td className="px-4 py-3 font-bold text-slate-800 text-sm">Total</td>
                    <td className="px-4 py-3 text-right num font-bold text-slate-800 text-sm">
                      {formatCurrency(allocation.totalSSP)}
                    </td>
                    <td className="px-4 py-3 text-right num font-bold text-slate-800 text-sm">
                      100.0%
                    </td>
                    <td className="px-4 py-3 text-right num font-bold text-slate-900 text-sm">
                      {formatCurrency(contract.totalContractValue)}
                    </td>
                    <td className="px-4 py-3 text-right num font-bold text-slate-800 text-sm">
                      100.0%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Allocation formula note */}
            <div className="px-5 py-4 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600">
                  <strong>Allocation formula:</strong> Allocated Amount = (SSP
                  <sub>i</sub> / Σ SSP) × Transaction Price.
                  Where transaction price = {formatCurrency(contract.totalContractValue)} and total
                  SSP = {formatCurrency(allocation.totalSSP)}.
                  {allocation.totalSSP !== contract.totalContractValue && (
                    <span className="ml-1 text-amber-600">
                      Note: total SSP differs from TCV; the relative SSP method is applied per ASC
                      606-10-32-28.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Pie-style allocation visual */}
            <div className="px-5 py-4 border-t border-slate-100">
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                Allocation Breakdown
              </h3>
              <div className="space-y-2.5">
                {allocation.rows.map((row, i) => {
                  const colors = [
                    'bg-sky-500', 'bg-indigo-500', 'bg-emerald-500',
                    'bg-amber-500', 'bg-violet-500', 'bg-pink-500',
                  ]
                  const pct = row.allocationPct * 100
                  return (
                    <div key={row.obligationId}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span className="font-medium truncate mr-2">{row.obligationName}</span>
                        <span className="num flex-shrink-0">
                          {formatCurrency(row.allocatedAmount)} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', colors[i % colors.length])}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Recognition Schedule */}
        {tab === 'schedule' && (
          <div>
            <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
              <p className="text-xs text-slate-500">
                <strong className="text-slate-700">Step 5 of ASC 606:</strong> Revenue is
                recognized when (or as) each performance obligation is satisfied. This schedule
                shows the revenue recognition timeline for all obligations under this contract.
              </p>
            </div>

            {monthSummaries.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-slate-400">
                No recognition schedule generated. Add performance obligations with valid dates.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="bg-white border-b border-slate-100">
                      <th className="table-th">Period</th>
                      {obligations.map((po) => (
                        <th key={po.id} className="table-th text-right">
                          <div className="text-right max-w-[140px] ml-auto">
                            <div className="truncate">{po.name}</div>
                            <div className="text-[10px] font-normal text-slate-400 mt-0.5 normal-case tracking-normal">
                              {po.recognitionMethod === 'ratable'
                                ? 'Ratable'
                                : po.recognitionMethod === 'milestone'
                                ? 'Milestone'
                                : 'Point-in-time'}
                            </div>
                          </div>
                        </th>
                      ))}
                      <th className="table-th text-right bg-slate-50">Total</th>
                      <th className="table-th text-right bg-slate-50">Cumulative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let cumulative = 0
                      const currentPeriod = new Date().toISOString().slice(0, 7)
                      return monthSummaries.map((summary) => {
                        cumulative += summary.totalRecognized
                        const isPast = summary.period <= currentPeriod
                        return (
                          <tr
                            key={summary.period}
                            className={cn(
                              'hover:bg-slate-50 transition-colors',
                              summary.period === currentPeriod && 'bg-emerald-50/50'
                            )}
                          >
                            <td className="table-td">
                              <div className="flex items-center gap-2">
                                {summary.period === currentPeriod && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                )}
                                <span
                                  className={cn(
                                    'num text-sm',
                                    isPast ? 'text-slate-700 font-medium' : 'text-slate-400'
                                  )}
                                >
                                  {formatPeriod(summary.period)}
                                </span>
                              </div>
                            </td>
                            {obligations.map((po) => {
                              const entry = summary.entries.find(
                                (e) => e.obligationId === po.id
                              )
                              return (
                                <td key={po.id} className="table-td text-right">
                                  {entry ? (
                                    <span
                                      className={cn(
                                        'num text-sm',
                                        isPast ? 'font-medium text-slate-700' : 'text-slate-400'
                                      )}
                                    >
                                      {formatCurrency(entry.recognizedAmount)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-200">—</span>
                                  )}
                                </td>
                              )
                            })}
                            <td className="table-td text-right bg-slate-50/50">
                              <span
                                className={cn(
                                  'num font-semibold',
                                  isPast ? 'text-slate-800' : 'text-slate-400'
                                )}
                              >
                                {formatCurrency(summary.totalRecognized)}
                              </span>
                            </td>
                            <td className="table-td text-right bg-slate-50/50">
                              <span
                                className={cn(
                                  'num text-sm',
                                  isPast ? 'text-slate-600' : 'text-slate-300'
                                )}
                              >
                                {formatCurrency(cumulative)}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    })()}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td className="px-4 py-3 font-bold text-slate-800 text-sm">Total</td>
                      {obligations.map((po) => {
                        const poTotal = allScheduleEntries
                          .filter((e) => e.obligationId === po.id)
                          .reduce((s, e) => s + e.recognizedAmount, 0)
                        return (
                          <td key={po.id} className="px-4 py-3 text-right num font-bold text-slate-800 text-sm">
                            {formatCurrency(poTotal)}
                          </td>
                        )
                      })}
                      <td className="px-4 py-3 text-right num font-bold text-slate-900 text-sm bg-slate-100">
                        {formatCurrency(allScheduleEntries.reduce((s, e) => s + e.recognizedAmount, 0))}
                      </td>
                      <td className="px-4 py-3 bg-slate-100" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete */}
      <div className="flex justify-end pt-2">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-ghost text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
            Delete Contract
          </button>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
            <span className="text-sm text-red-700">
              Delete <strong>{contract.contractNumber}</strong>? This cannot be undone.
            </span>
            <button onClick={handleDelete} className="btn-danger py-1.5 px-3 text-xs">
              Confirm Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="btn-secondary py-1.5 px-3 text-xs"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
