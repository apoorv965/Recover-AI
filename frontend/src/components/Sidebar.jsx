import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ListChecks, ScrollText, BarChart3, ShieldCheck, Zap, IndianRupee, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/cases', label: 'Recovery Cases', icon: ListChecks },
  { to: '/audit-trail', label: 'Audit Trail', icon: ScrollText },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/market', label: 'Market Intelligence', icon: IndianRupee },
]

export default function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 bg-ink-900 border-r border-white/5 flex flex-col">
      <div className="px-5 py-6 flex items-center gap-2.5 border-b border-white/5">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/20">
          <Zap size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <div className="text-white font-bold text-[15px] leading-tight tracking-tight">RecoverAI</div>
          <div className="text-ink-500 text-[11px] leading-tight">Revenue Recovery Agent</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-ink-500 hover:text-ink-100 hover:bg-white/5'
              }`
            }
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/5">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-mint-500/10 text-mint-400 text-xs font-medium">
          <ShieldCheck size={15} />
          Policy Engine active
        </div>
        <p className="text-ink-500 text-[11px] mt-3 px-1 leading-relaxed">
          AI recommends → Policy validates → Action executes → Audit records.
        </p>
      </div>

      {user && (
        <div className="px-4 py-4 border-t border-white/5 flex items-center gap-2.5">
          {user.picture ? (
            <img
              src={user.picture}
              alt={user.name || user.email}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full border border-white/10 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-semibold shrink-0">
              {(user.name || user.email || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-ink-100 text-xs font-medium truncate">{user.name || user.email}</div>
            <div className="text-ink-500 text-[11px] truncate">{user.email}</div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-500 hover:text-rose-400 hover:bg-white/5 transition-colors shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
      )}
    </aside>
  )
}
