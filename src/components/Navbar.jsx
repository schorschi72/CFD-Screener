import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: '📊 Screener' },
  { to: '/calendar', label: '📅 Kalender' },
  { to: '/journal', label: '📓 Journal' },
  { to: '/backtest', label: '🔬 Backtest' },
  { to: '/settings', label: '⚙️ Einstellungen' },
]

export default function Navbar() {
  return (
    <nav className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <span className="font-bold text-blue-400 text-lg tracking-tight">Plus500 Screener</span>
        <div className="flex gap-1">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
