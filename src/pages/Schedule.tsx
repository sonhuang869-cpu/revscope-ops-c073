import { useState, useMemo } from 'react'
import { CalendarDays, TrendingUp, Download } from 'lucide-react'
import { getContracts, getObligations } from '../lib/storage'
import {
  calculateAllocation,
  generateScheduleForObligation,
  formatCurrency,
} from '../lib/calculations'
import { formatPeriod, cn } from '../lib/utils'
import { format, addMonths, startOfMonth } from 'date-fns'

type ViewMode = 'by-period' | 'by-contract'

export default function Schedule() {
  const contracts = getContracts()
  const obligations = getObligations()
  const [viewMode, setViewMode] = useState<ViewMode>('by-period')
  const [yearFilter, setYearFilter] = useState<string>(String(new Date().getFullYear()))

  const currentPeriod = format(new Date(), 'yyyy-MM')

  // Build all schedule entries across portfolio
  const allEntries = useMemo(() => {
    const entries: Array<{
      period: string
      contractId: string
      contractNumber: string
      customer: string
      obligationId: string
      obligationName: string
      method: string
      amount: number
    }> = []

    for (const contract of contracts.filter(
      (c) => c.status === 'active' || c.status === 'completed'
    )) {
      const pos = obligations.filter((po) => po.contractId === contract.id)
      const allocation = calculateAllocation(contract, pos)

      for (const po of pos) {
        const row = allocation.rows.find((r) => r.obligationId === po.id)
        if (!row) continue
        const schedule = generateScheduleForObligation(po, row.allocatedAmount)
        for (const entry of schedule) {
          entries.push({
            period: entry.period,
            contractId: contract.id,
            contractNumber: contract.contractNumber,
            customer: contract.customer,
            obligationId: po.id,
            obligationName: po.name,
            method: po.recognitionMethod,
            amount: entry.recognizedAmount,
          })
        }
      }
    }

    return entries.sort((a, b) => a.period.localeCompare(b.period))
  }, [contracts, obligations])

  // Available years
  const years = useMemo(() => {
    const ys = new Set<string>()
    for (const e of allEntries) {
      ys.add(e.period.slice(0, 4))
    }
    return Array.from(ys).sort()
  }, [allEntries])

  // Filtered entries by year
  const filtered = useMemo(() => {
    return allEntries.filter((e) => e.period.startsWith(yearFilter))
  }, [allEntries, yearFilter])

  // Group by period
  const byPeriod = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const e of filtered) {
      const list = map.get(e.period) ?? []
      list.push(e)
      map.set(e.period, list)
    }
    return map
  }, [filtered])

  const periods = Array.from(byPeriod.keys()).sort()
  const yearTotal = filtered.reduce((s, e) => s + e.amount, 0)

  // By-contract grouping
  const byContract = useMemo(() => {
    const map = new Map<string, { customer: string; contractNumber: string; entries: typeof filtered }>()
    for (const e of filtered) {
      const existing = map.get(e.contractId) ?? {
        customer: e.customer,
        contractNumber: e.contractNumber,
        entries: [],
      }
      existing.entries.push(e)
      map.set(e.contractId, existing)
    }
    return map
  }, [filtered])

  // All 12 month columns for the year
  const monthColumns = useMemo(() => {
    const cols: string[] = []
    for (let m = 0; m < 12; m++) {
      cols.push(`${yearFilter}-${String(m + 1).padStart(2, '0')}`)
    }
    return cols
  }, [yearFilter])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Revenue Recognition Schedule</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Portfolio-level recognition timeline per ASC 606 Step 5
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Year filter */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="select w-auto text-xs py-1.5 px-3"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
            {!years.includes(yearFilter) && (
              <option value={yearFilter}>{yearFilter}</option>
            )}
          </select>

          {/* View mode */}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            {(['by-period', 'by-contract'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  viewMode === mode
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                {mode === 'by-period' ? 'By Period' : 'By Contract'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Year summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {monthColumns.slice(0, 4).map((period) => {
          const periodEntries = byPeriod.get(period) ?? []
          const total = periodEntries.reduce((s, e) => s + e.amount, 0)
          const isCurrentMonth = period === currentPeriod
          return (
            <div
              key={period}
              className={cn(
                'card p-3',
                isCurrentMonth && 'border-emerald-200 bg-emerald-50/30'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'text-xs font-semibold',
                    isCurrentMonth ? 'text-emerald-600' : 'text-slate-500'
                  )}
                >
                  {formatPeriod(period)}
                </span>
                {isCurrentMonth && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                    Current
                  </span>
                )}
              </div>
              <div className={cn('text-lg font-bold num', total > 0 ? 'text-slate-900' : 'text-slate-300')}>
                {total > 0 ? formatCurrency(total, true) : '—'}
              </div>
              {total > 0 && (
                <div className="text-xs text-slate-400 mt-0.5">
                  {periodEntries.length} recognition{periodEntries.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Year total + totals by contract (annual view) */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-800">
              {yearFilter} Recognition Schedule
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Full year total:
            </span>
            <span className="text-sm font-bold text-slate-900 num">
              {formatCurrency(yearTotal)}
            </span>
          </div>
        </div>

        {/* By-period view */}
        {viewMode === 'by-period' && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="table-th">Period</th>
                  <th className="table-th">Customer</th>
                  <th className="table-th hidden md:table-cell">Contract #</th>
                  <th className="table-th">Obligation</th>
                  <th className="table-th hidden sm:table-cell">Method</th>
                  <th className="table-th text-right">Recognized</th>
                </tr>
              </thead>
              <tbody>
                {periods.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                      No revenue recognized in {yearFilter}.
                    </td>
                  </tr>
                ) : (
                  periods.map((period) => {
                    const periodEntries = byPeriod.get(period)!
                    const periodTotal = periodEntries.reduce((s, e) => s + e.amount, 0)
                    const isPast = period <= currentPeriod
                    return periodEntries.map((entry, j) => (
                      <tr
                        key={`${entry.obligationId}-${period}`}
                        className={cn(
                          'hover:bg-slate-50 transition-colors',
                          period === currentPeriod && 'bg-emerald-50/30'
                        )}
                      >
                        {j === 0 && (
                          <td
                            className="table-td align-top"
                            rowSpan={periodEntries.length}
                          >
                            <div className="flex items-center gap-2">
                              {period === currentPeriod && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                              )}
                              <span
                                className={cn(
                                  'num text-sm font-medium',
                                  isPast ? 'text-slate-800' : 'text-slate-400'
                                )}
                              >
                                {formatPeriod(period)}
                              </span>
                            </div>
                            <div className={cn('text-xs num mt-0.5', isPast ? 'text-emerald-600 font-semibold' : 'text-slate-300')}>
                              {formatCurrency(periodTotal)}
                            </div>
                          </td>
                        )}
                        <td className="table-td text-sm text-slate-700 font-medium">
                          {entry.customer}
                        </td>
                        <td className="table-td hidden md:table-cell">
                          <span className="font-mono text-xs text-slate-400">
                            {entry.contractNumber}
                          </span>
                        </td>
                        <td className="table-td text-sm text-slate-600 max-w-[180px] truncate">
                          {entry.obligationName}
                        </td>
                        <td className="table-td hidden sm:table-cell">
                          <span className="text-xs text-slate-400 capitalize">
                            {entry.method.replace('_', '-')}
                          </span>
                        </td>
                        <td className="table-td text-right num font-semibold text-slate-700">
                          {formatCurrency(entry.amount)}
                        </td>
                      </tr>
                    ))
                  })
                )}
              </tbody>
              {periods.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={5} className="px-4 py-3 font-bold text-slate-800 text-sm">
                      {yearFilter} Total
                    </td>
                    <td className="px-4 py-3 text-right num font-bold text-slate-900 text-sm">
                      {formatCurrency(yearTotal)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* By-contract view: monthly columns */}
        {viewMode === 'by-contract' && (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: '900px' }}>
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="table-th sticky left-0 bg-white z-10" style={{ minWidth: 160 }}>
                    Customer / Obligation
                  </th>
                  {monthColumns.map((m) => (
                    <th
                      key={m}
                      className={cn(
                        'table-th text-right',
                        m === currentPeriod && 'bg-emerald-50 text-emerald-600'
                      )}
                    >
                      {format(new Date(m + '-01'), 'MMM')}
                    </th>
                  ))}
                  <th className="table-th text-right bg-slate-50">Total</th>
                </tr>
              </thead>
              <tbody>
                {byContract.size === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-10 text-center text-sm text-slate-400">
                      No revenue recognized in {yearFilter}.
                    </td>
                  </tr>
                ) : (
                  Array.from(byContract.entries()).map(([contractId, { customer, contractNumber, entries }]) => {
                    // Group by obligation
                    const byObligation = new Map<string, { name: string; amounts: Map<string, number> }>()
                    for (const e of entries) {
                      const ob = byObligation.get(e.obligationId) ?? {
                        name: e.obligationName,
                        amounts: new Map(),
                      }
                      ob.amounts.set(e.period, e.amount)
                      byObligation.set(e.obligationId, ob)
                    }

                    const contractTotal = entries.reduce((s, e) => s + e.amount, 0)

                    return Array.from(byObligation.entries()).map(([obId, { name, amounts }], i) => {
                      const obTotal = Array.from(amounts.values()).reduce((s, v) => s + v, 0)
                      return (
                        <tr key={obId} className="hover:bg-slate-50 transition-colors border-b border-slate-50">
                          <td className="table-td sticky left-0 bg-white z-10">
                            {i === 0 && (
                              <div className="text-xs font-semibold text-slate-700 truncate">
                                {customer}
                              </div>
                            )}
                            <div className="text-xs text-slate-500 truncate pl-2 mt-0.5">
                              {name}
                            </div>
                          </td>
                          {monthColumns.map((m) => {
                            const amount = amounts.get(m) ?? 0
                            return (
                              <td
                                key={m}
                                className={cn(
                                  'table-td text-right',
                                  m === currentPeriod && 'bg-emerald-50/30'
                                )}
                              >
                                {amount > 0 ? (
                                  <span className="num text-xs text-slate-700">
                                    {formatCurrency(amount, true)}
                                  </span>
                                ) : (
                                  <span className="text-slate-200 text-xs">—</span>
                                )}
                              </td>
                            )
                          })}
                          <td className="table-td text-right bg-slate-50/50">
                            <span className="num text-xs font-semibold text-slate-700">
                              {formatCurrency(obTotal, true)}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  })
                )}
              </tbody>
              {byContract.size > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td className="px-4 py-3 font-bold text-slate-800 text-sm sticky left-0 bg-slate-50">
                      Total
                    </td>
                    {monthColumns.map((m) => {
                      const monthTotal = (byPeriod.get(m) ?? []).reduce((s, e) => s + e.amount, 0)
                      return (
                        <td
                          key={m}
                          className={cn(
                            'px-4 py-3 text-right num text-sm font-bold',
                            m === currentPeriod ? 'bg-emerald-50 text-emerald-700' : 'text-slate-800'
                          )}
                        >
                          {monthTotal > 0 ? formatCurrency(monthTotal, true) : '—'}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-right num font-bold text-slate-900 text-sm bg-slate-100">
                      {formatCurrency(yearTotal, true)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Footnote */}
      <div className="flex items-start gap-2 text-xs text-slate-400 px-1">
        <TrendingUp className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          Amounts shown are calculated from allocated transaction prices per ASC 606-10-32-28.
          Draft and terminated contracts are excluded. Recognition for future periods is
          scheduled based on current obligation terms.
        </span>
      </div>
    </div>
  )
}
