import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, PiggyBank, TrendingUp, Activity, ShieldOff, RefreshCcw } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'
import { api } from '../api/client'
import StatCard from '../components/StatCard'
import { StrategyBadge } from '../components/StatusBadge'

const STRATEGY_COLORS = {
  immediate_retry: '#5b8def',
  delayed_retry: '#fbbf24',
  personalized_reminder: '#34d399',
  recovery_link: '#a78bfa',
  no_action: '#4a5875',
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  const load = () => {
    setLoading(true)
    api.getDashboard().then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSeed = async () => {
    setSeeding(true)
    await api.runSimulation(60)
    await load()
    setSeeding(false)
  }

  if (loading || !data) {
    return <div className="text-ink-500 text-sm">Loading dashboard…</div>
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-ink-500 text-sm mt-1">
            Real-time view of revenue at risk and the agent's recovery performance.
          </p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="flex items-center gap-2 text-sm font-medium bg-ink-800 hover:bg-ink-700 text-ink-100 px-3.5 py-2 rounded-lg border border-white/5 transition-colors disabled:opacity-50"
        >
          <RefreshCcw size={14} className={seeding ? 'animate-spin' : ''} />
          {seeding ? 'Generating…' : 'Simulate new transactions'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Revenue at Risk"
          value={`$${data.total_revenue_at_risk.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          sublabel={`${data.total_cases} recovery cases opened`}
          icon={AlertTriangle}
          accent="amber"
        />
        <StatCard
          label="Revenue Recovered"
          value={`$${data.total_revenue_recovered.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          sublabel={`${data.recovered_cases} cases recovered`}
          icon={PiggyBank}
          accent="mint"
        />
        <StatCard
          label="Recovery Rate"
          value={`${data.recovery_rate}%`}
          sublabel="of at-risk revenue recovered"
          icon={TrendingUp}
          accent="brand"
        />
        <StatCard
          label="Active Cases"
          value={data.active_cases}
          sublabel={`${data.stopped_cases} stopped · ${data.exhausted_cases} exhausted`}
          icon={Activity}
          accent="brand"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-white mb-4">Revenue at risk vs. recovered</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.revenue_over_time}>
              <defs>
                <linearGradient id="atRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="recovered" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2233" vertical={false} />
              <XAxis dataKey="date" stroke="#4a5875" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#4a5875" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: '#131a28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e5e9f0' }}
              />
              <Area type="monotone" dataKey="at_risk" name="At Risk" stroke="#fbbf24" fill="url(#atRisk)" strokeWidth={2} />
              <Area type="monotone" dataKey="recovered" name="Recovered" stroke="#34d399" fill="url(#recovered)" strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Cases by status</h2>
          <div className="space-y-3">
            {Object.entries(data.cases_by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-ink-100 capitalize">{status.replace('_', ' ')}</span>
                <div className="flex items-center gap-2 flex-1 mx-3">
                  <div className="h-1.5 bg-ink-800 rounded-full flex-1 overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full"
                      style={{ width: `${data.total_cases ? (count / data.total_cases) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-white w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
          <Link to="/cases" className="mt-5 inline-block text-xs text-brand-400 font-medium hover:underline">
            View all cases →
          </Link>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Recovery performance by strategy</h2>
        {data.performance_by_strategy.length === 0 ? (
          <p className="text-ink-500 text-sm">No cases have been processed by the AI agent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th>Attempts</th>
                  <th>Recovered</th>
                  <th>Recovered Amount</th>
                  <th>Recovery Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.performance_by_strategy.map((p) => (
                  <tr key={p.strategy}>
                    <td><StrategyBadge strategy={p.strategy} /></td>
                    <td>{p.attempts}</td>
                    <td>{p.recovered_count}</td>
                    <td>${p.recovered_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>
                      <span className={`font-semibold ${p.recovery_rate > 30 ? 'text-mint-400' : 'text-ink-100'}`}>
                        {p.recovery_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
