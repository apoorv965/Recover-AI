import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, PlayCircle, CheckCircle2, ShieldOff, Brain, Sparkles } from 'lucide-react'
import { api } from '../api/client'
import { StatusBadge, StrategyBadge } from '../components/StatusBadge'
import Timeline from '../components/Timeline'

export default function CaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [c, setC] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = () => api.getCase(id).then(setC).finally(() => setLoading(false))

  useEffect(() => { load() }, [id])

  const runAction = async (fn) => {
    setBusy(true)
    try {
      await fn()
      await load()
    } finally {
      setBusy(false)
    }
  }

  if (loading || !c) return <div className="text-ink-500 text-sm">Loading case…</div>

  const canProcess = !['recovered', 'stopped', 'exhausted'].includes(c.status)
  const canSucceed = c.status !== 'recovered'
  const canOptOut = !c.opted_out && c.status !== 'recovered'

  return (
    <div className="max-w-5xl">
      <button
        onClick={() => navigate('/cases')}
        className="flex items-center gap-1.5 text-ink-500 hover:text-ink-100 text-sm mb-5"
      >
        <ArrowLeft size={15} /> Back to cases
      </button>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">{c.customer_name}</h1>
            <StatusBadge status={c.status} />
          </div>
          <p className="text-ink-500 text-sm">{c.customer_email} · Case {c.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {canProcess && (
            <button
              disabled={busy}
              onClick={() => runAction(() => api.processCase(id))}
              className="flex items-center gap-2 text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <PlayCircle size={15} /> Run Recovery Pipeline
            </button>
          )}
          {canSucceed && (
            <button
              disabled={busy}
              onClick={() => runAction(() => api.simulateSuccess(id))}
              className="flex items-center gap-2 text-sm font-medium bg-mint-500/15 hover:bg-mint-500/25 text-mint-400 px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCircle2 size={15} /> Simulate Success
            </button>
          )}
          {canOptOut && (
            <button
              disabled={busy}
              onClick={() => runAction(() => api.optOut(id))}
              className="flex items-center gap-2 text-sm font-medium bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <ShieldOff size={15} /> Opt Out (STOP)
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="card p-5">
          <div className="text-ink-500 text-xs uppercase font-medium mb-1">Amount at Risk</div>
          <div className="text-2xl font-bold text-white">${c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          {c.recovered_amount > 0 && (
            <div className="text-mint-400 text-xs font-medium mt-1">${c.recovered_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} recovered</div>
          )}
        </div>
        <div className="card p-5">
          <div className="text-ink-500 text-xs uppercase font-medium mb-1">Event Type</div>
          <div className="text-lg font-semibold text-white capitalize">{c.event_type.replace('_', ' ')}</div>
          <div className="text-xs text-ink-500 mt-1">Failure code: {c.failure_code || 'n/a'}</div>
        </div>
        <div className="card p-5">
          <div className="text-ink-500 text-xs uppercase font-medium mb-1">Attempts</div>
          <div className="text-lg font-semibold text-white">{c.attempts} / {c.max_attempts}</div>
          <div className="text-xs text-ink-500 mt-1">
            {c.last_attempt_at ? `Last: ${new Date(c.last_attempt_at).toLocaleString()}` : 'No attempts yet'}
          </div>
        </div>
      </div>

      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-brand-500/15 flex items-center justify-center">
            <Brain size={15} className="text-brand-400" />
          </div>
          <h2 className="text-sm font-semibold text-white">AI Reasoning</h2>
        </div>
        {c.ai_explanation ? (
          <div className="space-y-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-500">Failure reason:</span>
                <span className="text-sm text-white font-medium">{c.failure_reason}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-500">Recoverability:</span>
                <span className="text-sm font-bold text-white">{c.recoverability_score}/100</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-500">Recommended:</span>
                <StrategyBadge strategy={c.recommended_strategy} />
              </div>
            </div>
            <p className="text-sm text-ink-100/90 leading-relaxed bg-ink-850 border border-white/5 rounded-lg px-4 py-3">
              <Sparkles size={13} className="inline mr-1.5 -mt-0.5 text-brand-400" />
              {c.ai_explanation}
            </p>
          </div>
        ) : (
          <p className="text-ink-500 text-sm">
            This case hasn't been analyzed yet. Click "Run Recovery Pipeline" to have the AI agent
            classify the failure and recommend a strategy.
          </p>
        )}
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-white mb-5">Recovery Timeline</h2>
        <Timeline logs={c.audit_logs} />
      </div>
    </div>
  )
}
