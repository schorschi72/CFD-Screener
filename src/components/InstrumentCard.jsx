import { useNavigate } from 'react-router-dom'

function probColor(p) {
  if (p >= 70) return 'text-emerald-400'
  if (p >= 55) return 'text-yellow-400'
  return 'text-red-400'
}

function dirBadge(dir) {
  if (dir === 'LONG') return <span className="badge-green">▲ LONG</span>
  if (dir === 'SHORT') return <span className="badge-red">▼ SHORT</span>
  return <span className="badge-yellow">→ NEUTRAL</span>
}

function MarketStateBadge({ state }) {
  if (!state) return null
  const map = {
    REGULAR: { label: '● Offen', cls: 'text-emerald-400' },
    PRE:     { label: '◐ Pre-Market', cls: 'text-yellow-400' },
    POST:    { label: '◑ After-Hours', cls: 'text-orange-400' },
    CLOSED:  { label: '○ Geschlossen', cls: 'text-slate-500' },
  }
  const m = map[state] ?? { label: state, cls: 'text-slate-500' }
  return <span className={`text-xs font-medium ${m.cls}`}>{m.label}</span>
}

export default function InstrumentCard({ instrument, quote, score, stopLoss, watched, onToggleWatch }) {
  const navigate = useNavigate()
  const change = quote?.changePercent ?? 0
  const isUp = change >= 0

  const decimals = instrument.pip < 0.001 ? 5 : instrument.pip < 0.1 ? 4 : 2

  return (
    <div className="card cursor-pointer hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-900/20 active:scale-[0.98] relative">
      {/* Watchlist star */}
      {onToggleWatch && (
        <button
          onClick={e => { e.stopPropagation(); onToggleWatch() }}
          className={`absolute top-3 right-3 text-base transition-transform active:scale-90 z-10 ${watched ? 'text-yellow-400' : 'text-slate-600 hover:text-yellow-400'}`}
        >
          {watched ? '★' : '☆'}
        </button>
      )}

      <div onClick={() => navigate(`/instrument/${instrument.symbol}`)}>
        <div className="flex justify-between items-start mb-3 pr-6">
          <div>
            <div className="font-bold text-white text-sm">{instrument.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-slate-500">{instrument.category}</span>
            <MarketStateBadge state={quote?.marketState} />
          </div>
          </div>
          <div className="text-right">
            {quote?.error ? (
              <div className="text-xs text-slate-500">Keine Daten</div>
            ) : (
              <>
                <div className="font-mono font-semibold text-white text-sm">
                  {quote?.price?.toFixed(decimals) ?? '—'}
                </div>
                <div className={`text-xs font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isUp ? '+' : ''}{change.toFixed(2)}%
                </div>
              </>
            )}
          </div>
        </div>

        {score ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              {dirBadge(score.direction)}
              <span className={`font-bold text-sm ${probColor(score.winProbability)}`}>
                {score.winProbability}%
              </span>
              <span className="text-xs text-slate-500 ml-auto">RSI {score.rsi?.toFixed(0)}</span>
            </div>

            {stopLoss && (
              <div className="grid grid-cols-3 gap-1.5 text-xs mb-3">
                <div className="bg-slate-700/50 rounded p-1.5 text-center">
                  <div className="text-slate-400 mb-0.5">Entry</div>
                  <div className="font-mono text-blue-400 text-xs">{stopLoss.entryPrice?.toFixed(decimals)}</div>
                </div>
                <div className="bg-red-950/30 rounded p-1.5 text-center">
                  <div className="text-slate-400 mb-0.5">SL</div>
                  <div className="font-mono text-red-400 text-xs">{stopLoss.stopLoss?.toFixed(decimals)}</div>
                </div>
                <div className="bg-emerald-950/30 rounded p-1.5 text-center">
                  <div className="text-slate-400 mb-0.5">TP</div>
                  <div className="font-mono text-emerald-400 text-xs">{stopLoss.takeProfit?.toFixed(decimals)}</div>
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Bear {100 - score.winProbability}%</span>
                <span>Bull {score.winProbability}%</span>
              </div>
              <div className="h-1.5 bg-red-900/40 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${score.winProbability}%` }} />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="skeleton h-3 rounded w-3/4" />
            <div className="skeleton h-3 rounded w-1/2" />
            <div className="skeleton h-3 rounded w-2/3" />
          </div>
        )}
      </div>
    </div>
  )
}
