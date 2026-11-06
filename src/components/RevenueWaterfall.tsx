import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import { formatCurrency } from '../lib/calculations'
import { format } from 'date-fns'

interface WaterfallItem {
  period: string
  label: string
  recognized: number
  deferred: number
}

interface Props {
  data: WaterfallItem[]
}

const CURRENT_PERIOD = format(new Date(), 'yyyy-MM')

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0a1628] text-white text-xs rounded-xl p-3 shadow-xl border border-white/10 min-w-[140px]">
      <div className="font-semibold text-slate-300 mb-2">{label}</div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-400">Recognized</span>
        <span className="font-semibold text-emerald-400 num">
          {formatCurrency(payload[0]?.value ?? 0)}
        </span>
      </div>
    </div>
  )
}

export default function RevenueWaterfall({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        barCategoryGap="30%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#f1f5f9"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'Inter' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v, true)}
          tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'Inter' }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="recognized" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.period}
              fill={
                entry.period === CURRENT_PERIOD
                  ? '#059669'
                  : entry.period < CURRENT_PERIOD
                  ? '#10b981'
                  : '#d1fae5'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
