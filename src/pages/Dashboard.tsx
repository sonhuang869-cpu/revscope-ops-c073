import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  Layers,
  Clock,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import MetricCard from '../components/MetricCard'
import RevenueWaterfall from '../components/RevenueWaterfall'
import StatusBadge from '../components/StatusBadge'
import { getContracts, getObligations } from '../lib/storage'
import {
  computePortfolioMetrics,
  buildWaterfallData,
  formatCurrency,
  calculateAllocation,
  generateScheduleForObligation,
} from '../lib/calculations'
import { formatDate } from '../lib/utils'
import { format, parseISO } from 'date-fns'

const CURRENT_PERIOD = format(new Date(), 'yyyy-MM')

export default function Dashboard() {
  const contracts = getContracts()
  const obligations = getObligations()

  const metrics = useMemo(
    () => computePortfolioMetrics(contracts, obligations),
    [contracts, obligations]
  )

  const waterfallData = useMemo(
    () => buildWaterfallData(contracts, obligations, 18),
    [contracts, obligations]
  )

  const recentContracts = useMemo(
    () =>
      [...contracts]
        .filter((c) => c.status !== 'terminated')
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 5),
    [contracts]
  )

  // Upcoming revenue recognitions this month
  const thisMonthEntries = useMemo(() => {
    const entries: Array<{ customer: string; poName: string; amount: number }> = []
    for (const contract of contracts.filter((c) => c.status === 'active')) {
      const pos = obligations.filter((po) => po.contractId === contract.id)
      const allocation = calculateAllocation(contract, pos)
      for (const po of pos) {
        const row = allocation.rows.find((r) => r.obligationId === po.id)
        if (!row) continue
        const schedule = generateScheduleForObligation(po, row.allocatedAmount)
        const thisMonth = schedule.find((e) => e.period === CURRENT_PERIOD)
        if (thisMonth && thisMonth.recognizedAmount > 0) {
          entries.push({
            customer: contract.customer,
            poName: po.name,
            amount: thisMonth.recognizedAmount,
          })
        }
      }
    }
    return entries.sort((a, b) => b.amount - a.amount).slice(0, 6)
  }, [contracts, obligations])

  const thisMonthTotal = thisMonthEntries.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Revenue Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            ASC 606 portfolio performance · {format(new Date(), 'MMMM yyyy')}
          </p>
        </div>
        <Link to="/contracts/new" className="btn-primary self-start">
          <span className="text-lg leading-none">+</span>
          New Contract
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total ARR"
          value={formatCurrency(metrics.totalARR, true)}
          subValue={formatCurrency(metrics.totalARR)}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          trend={{ value: '+12% YoY', positive: true }}
        />
        <MetricCard
          label="Recognized YTD"
          value={formatCurrency(metrics.recognizedYTD, true)}
          subValue={formatCurrency(metrics.recognizedYTD)}
          icon={<CheckCircle2 className="w-5 h-5 text-sky-600" />}
          iconBg="bg-sky-50"
        />
        <MetricCard
          label="Deferred Balance"
          value={formatCurrency(metrics.deferredBalance, true)}
          subValue={formatCurrency(metrics.deferredBalance)}
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          iconBg="bg-amber-50"
        />
        <MetricCard
          label="Active Contracts"
          value={String(metrics.activeContracts)}
          subValue={`${metrics.draftContracts} in draft`}
          icon={<Layers className="w-5 h-5 text-indigo-600" />}
          iconBg="bg-indigo-50"
        />
      </div>

      {/* Chart + This Month */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Waterfall */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Monthly Revenue Recognition</h2>
              <p className="text-xs text-slate-400 mt-0.5">Recognized revenue by period (18 months)</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                Recognized
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-100 inline-block" />
                Scheduled
              </span>
            </div>
          </div>
          <RevenueWaterfall data={waterfallData} />
        </div>

        {/* This Month */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800">
              {format(new Date(), 'MMMM')} Recognition
            </h2>
            <span className="text-xs font-medium text-emerald-600 num bg-emerald-50 px-2 py-0.5 rounded-full">
              {formatCurrency(thisMonthTotal, true)}
            </span>
          </div>
          <div className="space-y-2">
            {thisMonthEntries.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No recognitions this month</p>
            ) : (
              thisMonthEntries.map((e, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-2 py-2 border-b border-slate-50 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-700 truncate">{e.customer}</div>
                    <div className="text-[11px] text-slate-400 truncate">{e.poName}</div>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 num flex-shrink-0">
                    {formatCurrency(e.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Contracts */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">Recent Contracts</h2>
          </div>
          <Link
            to="/contracts"
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            View all
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr>
                <th className="table-th">Contract</th>
                <th className="table-th">Customer</th>
                <th className="table-th hidden sm:table-cell">Start</th>
                <th className="table-th hidden md:table-cell">End</th>
                <th className="table-th text-right">TCV</th>
                <th className="table-th">Status</th>
                <th className="table-th sr-only">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentContracts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="table-td">
                    <span className="font-mono text-xs text-slate-500">{c.contractNumber}</span>
                  </td>
                  <td className="table-td font-medium text-slate-900">{c.customer}</td>
                  <td className="table-td hidden sm:table-cell text-slate-500">
                    {formatDate(c.startDate)}
                  </td>
                  <td className="table-td hidden md:table-cell text-slate-500">
                    {formatDate(c.endDate)}
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
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      View
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ASC 606 steps reminder */}
      <div className="card p-5 bg-gradient-to-r from-[#0a1628] to-[#0f1f38] border-0">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">ASC 606 — Five-Step Model</h3>
            <div className="flex flex-wrap gap-2">
              {[
                'Identify contract',
                'Identify obligations',
                'Determine price',
                'Allocate price',
                'Recognize revenue',
              ].map((step, i) => (
                <span
                  key={i}
                  className="text-xs text-slate-300 bg-white/10 px-2.5 py-1 rounded-full"
                >
                  <span className="text-emerald-400 font-semibold mr-1">{i + 1}.</span>
                  {step}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
