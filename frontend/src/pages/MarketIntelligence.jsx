import { useMemo, useState } from 'react'
import { IndianRupee, TrendingUp, PiggyBank, Building2, Search } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis,
} from 'recharts'
import StatCard from '../components/StatCard'
import COMPANIES from '../data/indianCompanies.json'

const INDUSTRY_COLORS = [
  '#5b8def', '#34d399', '#fbbf24', '#f43f5e', '#a78bfa', '#22d3ee', '#f97316',
  '#84cc16', '#ec4899', '#14b8a6', '#eab308', '#6366f1', '#ef4444', '#10b981', '#8b5cf6',
]
const STATUS_COLORS = { Listed: '#5b8def', Private: '#4a5875' }
const PAGE_SIZE = 15

const fmtCr = (n) => `₹${Math.round(n).toLocaleString('en-IN')} Cr`
const fmtCrExact = (n) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`
const sum = (arr, key) => arr.reduce((a, d) => a + d[key], 0)
const avg = (arr, key) => (arr.length ? sum(arr, key) / arr.length : 0)
const uniqueSorted = (arr) => [...new Set(arr)].sort()

const tooltipStyle = { background: '#131a28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }

export default function MarketIntelligence() {
  const [industry, setIndustry] = useState('all')
  const [state, setState] = useState('all')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('rev25')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)

  const industries = useMemo(() => uniqueSorted(COMPANIES.map((c) => c.industry)), [])
  const states = useMemo(() => uniqueSorted(COMPANIES.map((c) => c.state)), [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return COMPANIES.filter((c) => {
      if (industry !== 'all' && c.industry !== industry) return false
      if (state !== 'all' && c.state !== state) return false
      if (status !== 'all' && c.status !== status) return false
      if (q && !(c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q))) return false
      return true
    })
  }, [industry, state, status, search])

  const kpis = useMemo(() => {
    const totalRev25 = sum(filtered, 'rev25')
    const totalRev24 = sum(filtered, 'rev24')
    const totalProfit = sum(filtered, 'profit')
    const totalMcap = sum(filtered, 'mcap')
    const yoy = totalRev24 > 0 ? ((totalRev25 - totalRev24) / totalRev24) * 100 : 0
    return {
      count: filtered.length,
      totalRev25, totalProfit, totalMcap, yoy,
      avgGrowth: avg(filtered, 'growth'),
      avgMargin: avg(filtered, 'margin'),
      listedCount: filtered.filter((c) => c.status === 'Listed').length,
    }
  }, [filtered])

  const revenueByIndustry = useMemo(() => {
    const map = new Map()
    filtered.forEach((c) => map.set(c.industry, (map.get(c.industry) || 0) + c.rev25))
    return [...map.entries()].map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value)
  }, [filtered])

  const revenueByState = useMemo(() => {
    const map = new Map()
    filtered.forEach((c) => map.set(c.state, (map.get(c.state) || 0) + c.rev25))
    return [...map.entries()].map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value)
  }, [filtered])

  const topCompanies = useMemo(
    () => [...filtered].sort((a, b) => b.rev25 - a.rev25).slice(0, 12).map((c) => ({
      name: c.name.length > 24 ? c.name.slice(0, 22) + '…' : c.name, value: Math.round(c.rev25),
    })),
    [filtered]
  )

  const statusSplit = useMemo(() => {
    const map = new Map()
    filtered.forEach((c) => map.set(c.status, (map.get(c.status) || 0) + c.rev25))
    return [...map.entries()].map(([name, value]) => ({ name, value: Math.round(value) }))
  }, [filtered])

  const growthBands = useMemo(() => {
    const bands = [
      { label: '< 0%', test: (g) => g < 0 },
      { label: '0-10%', test: (g) => g >= 0 && g < 10 },
      { label: '10-20%', test: (g) => g >= 10 && g < 20 },
      { label: '20-30%', test: (g) => g >= 20 && g < 30 },
      { label: '> 30%', test: (g) => g >= 30 },
    ]
    return bands.map((b) => ({ name: b.label, value: filtered.filter((c) => b.test(c.growth)).length }))
  }, [filtered])

  const scatterData = useMemo(() => {
    let sample = filtered
    if (sample.length > 800) {
      const step = Math.ceil(sample.length / 800)
      sample = sample.filter((_, i) => i % step === 0)
    }
    return sample.map((c) => ({ x: c.growth, y: c.margin, z: c.mcap, name: c.name }))
  }, [filtered])

  const sortedTable = useMemo(() => {
    const rows = [...filtered].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase() }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedTable.length / PAGE_SIZE))
  const pageRows = sortedTable.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(1)
  }

  const exportCSV = () => {
    const headers = ['name', 'industry', 'city', 'state', 'status', 'founded', 'employees', 'rev25', 'rev24', 'growth', 'profit', 'margin', 'dte', 'export', 'mcap']
    const rows = [headers.join(',')].concat(
      filtered.map((d) => headers.map((h) => `"${String(d[h]).replace(/"/g, '""')}"`).join(','))
    )
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'filtered_companies.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <IndianRupee size={20} className="text-brand-400" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Market Intelligence</h1>
        </div>
        <p className="text-ink-500 text-sm">
          5,000 Indian companies across {industries.length} industries &amp; {states.length} states · FY2024-25 vs FY2025-26 · figures in ₹ Crore
        </p>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide text-ink-500 font-semibold">Industry</label>
          <select
            value={industry}
            onChange={(e) => { setIndustry(e.target.value); setPage(1) }}
            className="bg-ink-850 border border-white/10 text-ink-100 rounded-lg px-2.5 py-2 text-xs min-w-[160px]"
          >
            <option value="all">All Industries</option>
            {industries.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide text-ink-500 font-semibold">State</label>
          <select
            value={state}
            onChange={(e) => { setState(e.target.value); setPage(1) }}
            className="bg-ink-850 border border-white/10 text-ink-100 rounded-lg px-2.5 py-2 text-xs min-w-[140px]"
          >
            <option value="all">All States</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide text-ink-500 font-semibold">Status</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
            className="bg-ink-850 border border-white/10 text-ink-100 rounded-lg px-2.5 py-2 text-xs min-w-[120px]"
          >
            <option value="all">All</option>
            <option value="Listed">Listed</option>
            <option value="Private">Private</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label className="text-[10px] uppercase tracking-wide text-ink-500 font-semibold">Search</label>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search company or city…"
              className="bg-ink-850 border border-white/10 text-ink-100 rounded-lg pl-7 pr-2.5 py-2 text-xs w-full placeholder:text-ink-500"
            />
          </div>
        </div>
        <button
          onClick={() => { setIndustry('all'); setState('all'); setStatus('all'); setSearch(''); setPage(1) }}
          className="text-xs font-medium bg-ink-800 hover:bg-ink-700 text-ink-100 px-3 py-2 rounded-lg border border-white/5 self-end"
        >
          Reset
        </button>
        <span className="text-xs text-ink-500 ml-auto self-end">
          Showing <strong className="text-ink-100">{filtered.length.toLocaleString()}</strong> of {COMPANIES.length.toLocaleString()} companies
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Companies" value={kpis.count.toLocaleString()} sublabel={`${kpis.listedCount} listed`} icon={Building2} accent="brand" />
        <StatCard
          label="Total Revenue FY25-26"
          value={fmtCr(kpis.totalRev25)}
          sublabel={`${kpis.yoy >= 0 ? '▲' : '▼'} ${Math.abs(kpis.yoy).toFixed(1)}% vs FY24-25`}
          icon={IndianRupee}
          accent="mint"
        />
        <StatCard label="Total Profit FY25-26" value={fmtCr(kpis.totalProfit)} sublabel={`${kpis.avgMargin.toFixed(1)}% avg margin`} icon={PiggyBank} accent="amber" />
        <StatCard label="Avg Revenue Growth" value={`${kpis.avgGrowth.toFixed(1)}%`} sublabel="YoY, simple average" icon={TrendingUp} accent={kpis.avgGrowth >= 0 ? 'mint' : 'rose'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Revenue by Industry (FY2025-26)</h2>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={revenueByIndustry} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2233" horizontal={false} />
              <XAxis type="number" stroke="#4a5875" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" stroke="#4a5875" fontSize={10.5} width={150} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtCr(v)} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {revenueByIndustry.map((_, i) => <Cell key={i} fill={INDUSTRY_COLORS[i % INDUSTRY_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Listed vs Private</h2>
          <ResponsiveContainer width="100%" height={340}>
            <PieChart>
              <Pie data={statusSplit} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={3}>
                {statusSplit.map((entry) => <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#4a5875'} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtCr(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Top 12 Companies by Revenue</h2>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={topCompanies} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2233" horizontal={false} />
              <XAxis type="number" stroke="#4a5875" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" stroke="#4a5875" fontSize={10} width={150} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtCr(v)} />
              <Bar dataKey="value" fill="#5b8def" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Revenue by State</h2>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={revenueByState} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2233" horizontal={false} />
              <XAxis type="number" stroke="#4a5875" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" stroke="#4a5875" fontSize={11} width={100} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtCr(v)} />
              <Bar dataKey="value" fill="#34d399" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Revenue Growth Distribution</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={growthBands}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2233" vertical={false} />
              <XAxis dataKey="name" stroke="#4a5875" fontSize={11} />
              <YAxis stroke="#4a5875" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v} companies`} />
              <Bar dataKey="value" fill="#fbbf24" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-1">Profit Margin vs Revenue Growth</h2>
          <p className="text-xs text-ink-500 mb-3">Each dot is a company · size = Market Cap</p>
          <ResponsiveContainer width="100%" height={230}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2233" />
              <XAxis type="number" dataKey="x" name="Growth %" stroke="#4a5875" fontSize={11} unit="%" />
              <YAxis type="number" dataKey="y" name="Margin %" stroke="#4a5875" fontSize={11} unit="%" />
              <ZAxis type="number" dataKey="z" range={[20, 300]} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} formatter={(v, key) => (key === 'z' ? undefined : `${v.toFixed?.(1) ?? v}%`)} />
              <Scatter data={scatterData} fill="#5b8def" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Company Explorer</h2>
          <button onClick={exportCSV} className="text-xs font-medium bg-ink-800 hover:bg-ink-700 text-ink-100 px-3 py-2 rounded-lg border border-white/5">
            ⬇ Export filtered CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table-shell">
            <thead>
              <tr>
                {[
                  ['name', 'Company'], ['industry', 'Industry'], ['state', 'State'], ['status', 'Status'],
                  ['founded', 'Founded'], ['rev25', 'Revenue FY25-26'], ['growth', 'Growth %'], ['margin', 'Margin %'], ['mcap', 'Market Cap'],
                ].map(([key, label]) => (
                  <th key={key} onClick={() => handleSort(key)} className={`cursor-pointer select-none ${sortKey === key ? 'text-brand-400' : ''}`}>
                    {label}{sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-ink-500 py-8">No companies match these filters.</td></tr>
              ) : pageRows.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium text-white">{c.name}</td>
                  <td className="text-xs">{c.industry}</td>
                  <td className="text-xs">{c.state}</td>
                  <td>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${c.status === 'Listed' ? 'bg-brand-500/15 text-brand-400' : 'bg-ink-700 text-ink-100'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="text-xs">{c.founded}</td>
                  <td>{fmtCrExact(c.rev25)}</td>
                  <td className={c.growth >= 0 ? 'text-mint-400 font-semibold' : 'text-rose-400 font-semibold'}>{c.growth >= 0 ? '+' : ''}{c.growth.toFixed(1)}%</td>
                  <td className={c.margin >= 0 ? 'text-mint-400 font-semibold' : 'text-rose-400 font-semibold'}>{c.margin.toFixed(1)}%</td>
                  <td>{fmtCrExact(c.mcap)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end gap-3 mt-4 text-xs text-ink-500">
          <span>Page {page} of {totalPages} · {sortedTable.length.toLocaleString()} rows</span>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="bg-ink-800 border border-white/5 rounded-md px-2.5 py-1.5 disabled:opacity-30">Prev</button>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="bg-ink-800 border border-white/5 rounded-md px-2.5 py-1.5 disabled:opacity-30">Next</button>
        </div>
      </div>
    </div>
  )
}
