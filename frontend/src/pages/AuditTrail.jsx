import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScrollText } from 'lucide-react'
import { api } from '../api/client'
import { PolicyBadge, StrategyBadge } from '../components/StatusBadge'

export default function AuditTrail() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listAuditLogs({ limit: 300 }).then(setLogs).finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-7xl">
      <div className="flex items-center gap-3 mb-1">
        <ScrollText size={22} className="text-brand-400" />
        <h1 className="text-2xl font-bold text-white tracking-tight">Audit Trail</h1>
      </div>
      <p className="text-ink-500 text-sm mt-1 mb-6">
        Immutable-style log of every AI recommendation, Policy Engine decision, and executed action.
      </p>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-shell">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Case</th>
                <th>Event</th>
                <th>AI Recommendation</th>
                <th>Policy Decision</th>
                <th>Explanation</th>
                <th>Execution Result</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center text-ink-500 py-8">Loading audit trail…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-ink-500 py-8">No audit entries yet.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-xs text-ink-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                    <td>
                      <Link to={`/cases/${log.case_id}`} className="text-brand-400 text-xs font-medium hover:underline">
                        {log.case_id}
                      </Link>
                    </td>
                    <td className="text-xs capitalize">{log.event.replaceAll('_', ' ')}</td>
                    <td>{log.ai_recommendation ? <StrategyBadge strategy={log.ai_recommendation} /> : <span className="text-ink-500 text-xs">—</span>}</td>
                    <td><PolicyBadge decision={log.policy_decision} /></td>
                    <td className="text-xs max-w-xs">{log.explanation}</td>
                    <td className="text-xs text-ink-500 max-w-[200px]">{log.execution_result}</td>
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
