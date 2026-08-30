export default function StatCard({ label, value, sublabel, icon: Icon, accent = 'brand' }) {
  const accents = {
    brand: 'text-brand-400 bg-brand-500/10',
    mint: 'text-mint-400 bg-mint-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    rose: 'text-rose-400 bg-rose-500/10',
  }
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-ink-500 text-xs font-medium uppercase tracking-wide">{label}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accents[accent]}`}>
            <Icon size={16} strokeWidth={2.2} />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      {sublabel && <div className="text-ink-500 text-xs">{sublabel}</div>}
    </div>
  )
}
