import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { api } from '../api/client'

const STATUS_COLORS = {
  open: '#5b8def',
  in_progress: '#fbbf24',
  recovered: '#34d399',
  stopped: '#f43f5e',
  exhausted: '#4a5875',
}

export default function Analytics() {
  const [data, setData] = useState(null)

  useEffect(() => { api.getDashboard().then(setData) }, [])

  if (!data) return <div className="text-ink-500 text-sm">Loading analytics…</div>

  const statusData = Object.entries(data.cases_by_status).map(([status, count]) => ({
    name: status.replace('_', ' '),
    value: count,
    color: STATUS_COLORS[status] || '#4a5875',
  }))

  const strategyChartData = data.performance_by_strategy.map((p) => ({
    strategy: p.strategy.replace('_', ' '),
    Attempts: p.attempts,
    Recovered: p.recovered_count,
  }))

  return (
    <div className="max-w-7xl">
      <div className="flex items-center gap-3 mb-1">
        <BarChart3 size={22} className="text-brand-400" />
        <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
      </div>
      <p className="text-ink-500 text-sm mt-1 mb-6">
        Deeper insight into how the recovery agent is performing across strategies and case states.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Attempts vs. recoveries by strategy</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={strategyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2233" vertical={false} />
              <XAxis dataKey="strategy" stroke="#4a5875" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#4a5875" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#131a28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Attempts" fill="#324058" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Recovered" fill="#34d399" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Case distribution by status</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={3}
              >
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#131a28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span className="capitalize text-ink-100">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-ink-500 text-xs uppercase font-medium mb-1">Total Cases Handled</div>
          <div className="text-2xl font-bold text-white">{data.total_cases}</div>
        </div>
        <div className="card p-5">
          <div className="text-ink-500 text-xs uppercase font-medium mb-1">Overall Recovery Rate</div>
          <div className="text-2xl font-bold text-mint-400">{data.recovery_rate}%</div>
        </div>
        <div className="card p-5">
          <div className="text-ink-500 text-xs uppercase font-medium mb-1">Best Performing Strategy</div>
          <div className="text-2xl font-bold text-white capitalize">
            {data.performance_by_strategy.length
              ? [...data.performance_by_strategy].sort((a, b) => b.recovery_rate - a.recovery_rate)[0].strategy.replace('_', ' ')
              : '—'}
          </div>
        </div>
      </div>
    </div>
  )
}
