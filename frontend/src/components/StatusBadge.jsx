const STATUS_STYLES = {
  open: 'bg-brand-500/15 text-brand-400',
  in_progress: 'bg-amber-500/15 text-amber-400',
  recovered: 'bg-mint-500/15 text-mint-400',
  stopped: 'bg-rose-500/15 text-rose-400',
  exhausted: 'bg-ink-600/40 text-ink-500',
}

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  recovered: 'Recovered',
  stopped: 'Stopped',
  exhausted: 'Exhausted',
}

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-ink-600/40 text-ink-500'
  const label = STATUS_LABELS[status] || status
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${style}`}>
      {label}
    </span>
  )
}

const STRATEGY_LABELS = {
  immediate_retry: 'Immediate Retry',
  delayed_retry: 'Delayed Retry',
  personalized_reminder: 'Personalized Reminder',
  recovery_link: 'Recovery Link',
  no_action: 'No Action',
}

export function StrategyBadge({ strategy }) {
  if (!strategy) return <span className="text-ink-500 text-xs">—</span>
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-ink-700 text-ink-100 border border-white/5">
      {STRATEGY_LABELS[strategy] || strategy}
    </span>
  )
}

const POLICY_STYLES = {
  allowed: 'bg-mint-500/15 text-mint-400',
  blocked: 'bg-rose-500/15 text-rose-400',
  'n/a': 'bg-ink-600/40 text-ink-500',
  stop_all_actions: 'bg-mint-500/15 text-mint-400',
}

export function PolicyBadge({ decision }) {
  const style = POLICY_STYLES[decision] || 'bg-ink-600/40 text-ink-500'
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${style}`}>
      {decision}
    </span>
  )
}
