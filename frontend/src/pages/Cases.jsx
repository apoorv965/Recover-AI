import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlayCircle, CheckCircle2, Search } from 'lucide-react'
import { api } from '../api/client'
import { StatusBadge, StrategyBadge } from '../components/StatusBadge'

const STATUS_FILTERS = ['all', 'open', 'in_progress', 'recovered', 'stopped', 'exhausted']
const TYPE_FILTERS = ['all', 'payment_failed', 'checkout_abandoned']

export default function Cases() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    const params = {}
    if (statusFilter !== 'all') params.status = statusFilter
    if (typeFilter !== 'all') params.event_type = typeFilter
    api.listCases(params).then(setCases).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [statusFilter, typeFilter])

  const filtered = cases.filter((c) =>
    c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_email.toLowerCase().includes(search.toLowerCase())
  )

  const handleProcess = async (id, e) => {
    e.stopPropagation()
    setBusyId(id)
    try {
      await api.processCase(id)
      load()
    } finally {
      setBusyId(null)
    }
  }

  const handleSimulateSuccess = async (id, e) => {
    e.stopPropagation()
    setBusyId(id)
    try {
      await api.simulateSuccess(id)
      load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Recovery Cases</h1>
        <p className="text-ink-500 text-sm mt-1">
          Every unit of revenue at risk, from open detection through recovery or closure.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer…"
            className="bg-ink-900 border border-white/5 rounded-lg pl-8 pr-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none focus:ring-1 focus:ring-brand-500 w-56"
          />
        </div>

        <div className="flex items-center gap-1 bg-ink-900 border border-white/5 rounded-lg p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                statusFilter === s ? 'bg-brand-500/20 text-brand-400' : 'text-ink-500 hover:text-ink-100'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-ink-900 border border-white/5 rounded-lg p-1">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                typeFilter === t ? 'bg-brand-500/20 text-brand-400' : 'text-ink-500 hover:text-ink-100'
              }`}
            >
              {t === 'all' ? 'All types' : t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-shell">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Failure Reason</th>
                <th>Score</th>
                <th>Strategy</th>
                <th>Status</th>
                <th>Attempts</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center text-ink-500 py-8">Loading cases…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-ink-500 py-8">No cases match these filters.</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/cases/${c.id}`)}
                    className="cursor-pointer"
                  >
                    <td>
                      <div className="font-medium text-white">{c.customer_name}</div>
                      <div className="text-xs text-ink-500">{c.customer_email}</div>
                    </td>
                    <td className="font-semibold">${c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="text-xs text-ink-500 capitalize">{c.event_type.replace('_', ' ')}</td>
                    <td className="text-xs">{c.failure_reason || '—'}</td>
                    <td>
                      {c.recoverability_score != null ? (
                        <span className={scoreColor(c.recoverability_score)}>{c.recoverability_score}</span>
                      ) : '—'}
                    </td>
                    <td><StrategyBadge strategy={c.recommended_strategy} /></td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="text-xs">{c.attempts}/{c.max_attempts}</td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        {c.status !== 'recovered' && c.status !== 'stopped' && c.status !== 'exhausted' && (
                          <button
                            title="Run AI → Policy → Action pipeline"
                            disabled={busyId === c.id}
                            onClick={(e) => handleProcess(c.id, e)}
                            className="p-1.5 rounded-md hover:bg-white/5 text-brand-400 disabled:opacity-40"
                          >
                            <PlayCircle size={16} />
                          </button>
                        )}
                        {c.status !== 'recovered' && (
                          <button
                            title="Simulate customer completing payment"
                            disabled={busyId === c.id}
                            onClick={(e) => handleSimulateSuccess(c.id, e)}
                            className="p-1.5 rounded-md hover:bg-white/5 text-mint-400 disabled:opacity-40"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function scoreColor(score) {
  if (score >= 60) return 'text-mint-400 font-semibold'
  if (score >= 30) return 'text-amber-400 font-semibold'
  return 'text-rose-400 font-semibold'
}
