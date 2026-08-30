import { CheckCircle2, XCircle, Circle, FileClock } from 'lucide-react'
import { PolicyBadge } from './StatusBadge'

function iconFor(log) {
  if (log.policy_decision === 'allowed' || log.policy_decision === 'stop_all_actions') {
    return <CheckCircle2 size={16} className="text-mint-400" />
  }
  if (log.policy_decision === 'blocked') {
    return <XCircle size={16} className="text-rose-400" />
  }
  return <Circle size={16} className="text-brand-400" />
}

export default function Timeline({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="text-ink-500 text-sm flex items-center gap-2 py-6 justify-center">
        <FileClock size={16} /> No events recorded yet.
      </div>
    )
  }

  return (
    <ol className="relative border-l border-white/10 ml-2">
      {logs.map((log, idx) => (
        <li key={log.id} className="mb-6 ml-5 last:mb-0">
          <span className="absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full bg-ink-900 ring-4 ring-ink-900">
            {iconFor(log)}
          </span>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-white">{formatEvent(log.event)}</span>
            <PolicyBadge decision={log.policy_decision} />
            {log.ai_recommendation && (
              <span className="text-xs text-ink-500">recommended: {log.ai_recommendation}</span>
            )}
          </div>
          <time className="text-xs text-ink-500 block mb-1.5">
            {new Date(log.timestamp).toLocaleString()}
          </time>
          {log.explanation && (
            <p className="text-sm text-ink-100/90 bg-ink-850 border border-white/5 rounded-lg px-3 py-2 mb-1.5 leading-relaxed">
              {log.explanation}
            </p>
          )}
          {log.execution_result && (
            <p className="text-xs text-ink-500 italic">→ {log.execution_result}</p>
          )}
        </li>
      ))}
    </ol>
  )
}

function formatEvent(event) {
  return event
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}
