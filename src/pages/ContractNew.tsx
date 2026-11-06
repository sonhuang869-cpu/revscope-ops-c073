import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChevronRight, Plus, Trash2, Info, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { upsertContract, upsertObligation } from '../lib/storage'
import { generateId } from '../lib/utils'
import { calculateAllocation, formatCurrency, formatPct } from '../lib/calculations'
import type { Contract, PerformanceObligation, POType, RecognitionMethod } from '../types'
import StatusBadge from '../components/StatusBadge'

type PODraft = {
  id: string
  name: string
  type: POType
  recognitionMethod: RecognitionMethod
  standaloneSellPrice: string
  startDate: string
  endDate: string
}

const PO_TYPES: Array<{ value: POType; label: string }> = [
  { value: 'saas_license', label: 'SaaS License' },
  { value: 'implementation', label: 'Implementation' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'support', label: 'Support' },
  { value: 'training', label: 'Training' },
  { value: 'other', label: 'Other' },
]

const REC_METHODS: Array<{ value: RecognitionMethod; label: string; desc: string }> = [
  { value: 'ratable', label: 'Ratable (over time)', desc: 'Even distribution across the term' },
  { value: 'milestone', label: 'Milestone-based', desc: 'At specific project milestones' },
  { value: 'point_in_time', label: 'Point-in-time', desc: 'On a single delivery date' },
]

function newPO(): PODraft {
  return {
    id: generateId(),
    name: '',
    type: 'saas_license',
    recognitionMethod: 'ratable',
    standaloneSellPrice: '',
    startDate: '',
    endDate: '',
  }
}

export default function ContractNew() {
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)

  const [customer, setCustomer] = useState('')
  const [industry, setIndustry] = useState('')
  const [contractDate, setContractDate] = useState(today)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [tcv, setTcv] = useState('')
  const [status, setStatus] = useState<Contract['status']>('draft')
  const [salesOwner, setSalesOwner] = useState('')
  const [notes, setNotes] = useState('')
  const [pos, setPOs] = useState<PODraft[]>([newPO()])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const totalSSP = pos.reduce((s, po) => s + (parseFloat(po.standaloneSellPrice) || 0), 0)
  const tcvNum = parseFloat(tcv) || 0

  // Live allocation preview
  const draftAllocation =
    tcvNum > 0 && pos.length > 0 && pos.some((p) => parseFloat(p.standaloneSellPrice) > 0)
      ? pos.map((po) => {
          const ssp = parseFloat(po.standaloneSellPrice) || 0
          const pct = totalSSP > 0 ? ssp / totalSSP : 0
          return { name: po.name || 'Unnamed', pct, allocated: pct * tcvNum }
        })
      : []

  function addPO() {
    setPOs([...pos, newPO()])
  }

  function removePO(id: string) {
    if (pos.length <= 1) return
    setPOs(pos.filter((p) => p.id !== id))
  }

  function updatePO(id: string, field: keyof PODraft, value: string) {
    setPOs(pos.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!customer.trim()) e.customer = 'Customer name is required'
    if (!startDate) e.startDate = 'Start date is required'
    if (!endDate) e.endDate = 'End date is required'
    if (startDate && endDate && endDate <= startDate)
      e.endDate = 'End date must be after start date'
    if (!tcv || tcvNum <= 0) e.tcv = 'Total contract value must be a positive number'
    pos.forEach((po, i) => {
      if (!po.name.trim()) e[`po_name_${i}`] = 'Name required'
      if (!po.standaloneSellPrice || parseFloat(po.standaloneSellPrice) <= 0)
        e[`po_ssp_${i}`] = 'SSP required'
      if (!po.startDate) e[`po_start_${i}`] = 'Start date required'
      if (po.recognitionMethod === 'ratable' && !po.endDate)
        e[`po_end_${i}`] = 'End date required for ratable'
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) {
      toast.error('Please fix the errors below')
      return
    }

    setSaving(true)
    const contractId = generateId()
    const now = new Date().toISOString()
    const contractNum = `CTR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`

    const contract: Contract = {
      id: contractId,
      contractNumber: contractNum,
      customer: customer.trim(),
      industry: industry.trim() || 'Not specified',
      contractDate,
      startDate,
      endDate,
      totalContractValue: tcvNum,
      status,
      currency: 'USD',
      salesOwner: salesOwner.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    }

    upsertContract(contract)

    pos.forEach((po, i) => {
      const obligation: PerformanceObligation = {
        id: po.id,
        contractId,
        sequence: i + 1,
        name: po.name.trim(),
        type: po.type,
        recognitionMethod: po.recognitionMethod,
        standaloneSellPrice: parseFloat(po.standaloneSellPrice),
        startDate: po.startDate,
        endDate: po.recognitionMethod === 'ratable' ? po.endDate : undefined,
        status: status === 'active' ? 'in_progress' : 'not_started',
      }
      upsertObligation(obligation)
    })

    toast.success(`Contract ${contractNum} created successfully`)
    navigate(`/contracts/${contractId}`)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500">
        <Link to="/contracts" className="hover:text-slate-700 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Contracts
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-900 font-medium">New Contract</span>
      </nav>

      <div>
        <h1 className="text-xl font-bold text-slate-900">New Revenue Contract</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Add a contract and define its performance obligations for ASC 606 recognition.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Contract Details */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Contract Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Customer Name *</label>
              <input
                type="text"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="e.g. Accenture Technology Solutions"
                className={`input ${errors.customer ? 'border-red-300 focus:ring-red-400' : ''}`}
              />
              {errors.customer && (
                <p className="text-xs text-red-500 mt-1">{errors.customer}</p>
              )}
            </div>

            <div>
              <label className="label">Industry</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Financial Services"
                className="input"
              />
            </div>

            <div>
              <label className="label">Sales Owner</label>
              <input
                type="text"
                value={salesOwner}
                onChange={(e) => setSalesOwner(e.target.value)}
                placeholder="e.g. Rebecca Nguyen"
                className="input"
              />
            </div>

            <div>
              <label className="label">Contract Date</label>
              <input
                type="date"
                value={contractDate}
                onChange={(e) => setContractDate(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Contract['status'])}
                className="select"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            </div>

            <div>
              <label className="label">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`input ${errors.startDate ? 'border-red-300' : ''}`}
              />
              {errors.startDate && (
                <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>
              )}
            </div>

            <div>
              <label className="label">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`input ${errors.endDate ? 'border-red-300' : ''}`}
              />
              {errors.endDate && (
                <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>
              )}
            </div>

            <div>
              <label className="label">Total Contract Value (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={tcv}
                  onChange={(e) => setTcv(e.target.value)}
                  placeholder="0"
                  className={`input pl-7 num ${errors.tcv ? 'border-red-300' : ''}`}
                />
              </div>
              {errors.tcv && <p className="text-xs text-red-500 mt-1">{errors.tcv}</p>}
              {tcvNum > 0 && (
                <p className="text-xs text-slate-400 mt-1 num">{formatCurrency(tcvNum)}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Additional contract context…"
                className="input resize-none"
              />
            </div>
          </div>
        </div>

        {/* Performance Obligations */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Performance Obligations</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Define distinct goods/services promised to the customer (ASC 606 Step 2)
              </p>
            </div>
            <button type="button" onClick={addPO} className="btn-secondary text-xs py-1.5">
              <Plus className="w-3.5 h-3.5" />
              Add PO
            </button>
          </div>

          {pos.map((po, i) => (
            <div
              key={po.id}
              className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Obligation {i + 1}
                </span>
                {pos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePO(po.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                    aria-label="Remove obligation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="label">Name *</label>
                  <input
                    type="text"
                    value={po.name}
                    onChange={(e) => updatePO(po.id, 'name', e.target.value)}
                    placeholder="e.g. SaaS Platform License"
                    className={`input ${errors[`po_name_${i}`] ? 'border-red-300' : ''}`}
                  />
                  {errors[`po_name_${i}`] && (
                    <p className="text-xs text-red-500 mt-1">{errors[`po_name_${i}`]}</p>
                  )}
                </div>

                <div>
                  <label className="label">Type</label>
                  <select
                    value={po.type}
                    onChange={(e) => updatePO(po.id, 'type', e.target.value)}
                    className="select"
                  >
                    {PO_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Recognition Method</label>
                  <select
                    value={po.recognitionMethod}
                    onChange={(e) => updatePO(po.id, 'recognitionMethod', e.target.value)}
                    className="select"
                  >
                    {REC_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    {REC_METHODS.find((m) => m.value === po.recognitionMethod)?.desc}
                  </p>
                </div>

                <div>
                  <label className="label">Standalone Selling Price (SSP) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={po.standaloneSellPrice}
                      onChange={(e) => updatePO(po.id, 'standaloneSellPrice', e.target.value)}
                      placeholder="0"
                      className={`input pl-7 num ${errors[`po_ssp_${i}`] ? 'border-red-300' : ''}`}
                    />
                  </div>
                  {errors[`po_ssp_${i}`] && (
                    <p className="text-xs text-red-500 mt-1">{errors[`po_ssp_${i}`]}</p>
                  )}
                </div>

                <div>
                  <label className="label">Start Date *</label>
                  <input
                    type="date"
                    value={po.startDate}
                    onChange={(e) => updatePO(po.id, 'startDate', e.target.value)}
                    className={`input ${errors[`po_start_${i}`] ? 'border-red-300' : ''}`}
                  />
                  {errors[`po_start_${i}`] && (
                    <p className="text-xs text-red-500 mt-1">{errors[`po_start_${i}`]}</p>
                  )}
                </div>

                {(po.recognitionMethod === 'ratable') && (
                  <div>
                    <label className="label">End Date *</label>
                    <input
                      type="date"
                      value={po.endDate}
                      onChange={(e) => updatePO(po.id, 'endDate', e.target.value)}
                      className={`input ${errors[`po_end_${i}`] ? 'border-red-300' : ''}`}
                    />
                    {errors[`po_end_${i}`] && (
                      <p className="text-xs text-red-500 mt-1">{errors[`po_end_${i}`]}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Live allocation preview */}
        {draftAllocation.length > 0 && (
          <div className="card p-5 border-indigo-100 bg-indigo-50/30">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-800">
                Live Allocation Preview
              </h3>
              <span className="text-xs text-slate-500">
                (based on relative SSPs · TCV: {formatCurrency(tcvNum)})
              </span>
            </div>
            <div className="space-y-2">
              {draftAllocation.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700 truncate">{item.name}</span>
                      <span className="num text-slate-600 ml-2 flex-shrink-0">
                        {formatCurrency(item.allocated)} ({formatPct(item.pct)})
                      </span>
                    </div>
                    <div className="h-2 bg-white rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 rounded-full transition-all"
                        style={{ width: `${item.pct * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Link to="/contracts" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Creating…' : 'Create Contract'}
          </button>
        </div>
      </form>
    </div>
  )
}
