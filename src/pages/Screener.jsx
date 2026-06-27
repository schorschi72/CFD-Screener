import { useState, useEffect, useCallback } from 'react'
import { INSTRUMENTS, CATEGORIES } from '../data/instruments'
import { fetchMultipleQuotes, fetchHistory } from '../services/yahooFinance'
import { scoreSignals, calcStopLoss } from '../services/technicalAnalysis'
import { useWatchlist } from '../store/watchlistStore'
import InstrumentCard from '../components/InstrumentCard'

const BATCH = 6

export default function Screener({ settings }) {
  const [quotes, setQuotes] = useState({})
  const [scores, setScores] = useState({})
  const [stopLosses, setStopLosses] = useState({})
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState('Alle')
  const [sortBy, setSortBy] = useState('winProbability')
  const [search, setSearch] = useState('')
  const [loadedCount, setLoadedCount] = useState(0)
  const [view, setView] = useState('all') // 'all' | 'watchlist'
  const [onlyOpen, setOnlyOpen] = useState(false)
  const { watchlist, isWatched, toggle } = useWatchlist()

  const getFiltered = useCallback((instruments) =>
    instruments.filter(i =>
      (category === 'Alle' || i.category === category) &&
      (search === '' || i.name.toLowerCase().includes(search.toLowerCase()) || i.symbol.toLowerCase().includes(search.toLowerCase()))
    ), [category, search])

  const sourceInstruments = view === 'watchlist'
    ? INSTRUMENTS.filter(i => watchlist.includes(i.symbol))
    : INSTRUMENTS

  const filtered = getFiltered(sourceInstruments).filter(i => {
    if (!onlyOpen) return true
    const state = quotes[i.symbol]?.marketState
    return state === 'REGULAR' || state === 'PRE' || state === 'POST'
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadedCount(0)
    const symbols = INSTRUMENTS.map(i => i.symbol)

    for (let start = 0; start < symbols.length; start += BATCH) {
      const batch = symbols.slice(start, start + BATCH)
      const batchQuotes = await fetchMultipleQuotes(batch)
      setQuotes(prev => {
        const next = { ...prev }
        batchQuotes.forEach((q, i) => { next[batch[i]] = q })
        return next
      })
      await Promise.allSettled(batch.map(async sym => {
        try {
          const candles = await fetchHistory(sym, '6mo', '1d')
          const score = scoreSignals(candles)
          if (score) {
            const sl = calcStopLoss(score, settings.riskLevel, settings.maxLossPercent)
            setScores(prev => ({ ...prev, [sym]: score }))
            setStopLosses(prev => ({ ...prev, [sym]: sl }))
          }
        } catch { /* skip */ }
      }))
      setLoadedCount(prev => prev + batch.length)
    }
    setLoading(false)
  }, [settings.riskLevel, settings.maxLossPercent])

  useEffect(() => { loadData() }, [])

  const sorted = [...filtered].sort((a, b) => {
    const sa = scores[a.symbol], sb = scores[b.symbol]
    if (sortBy === 'winProbability') return (sb?.winProbability ?? 0) - (sa?.winProbability ?? 0)
    if (sortBy === 'rsi') return (sa?.rsi ?? 50) - (sb?.rsi ?? 50)
    if (sortBy === 'change') return (quotes[b.symbol]?.changePercent ?? 0) - (quotes[a.symbol]?.changePercent ?? 0)
    return 0
  }).filter(i => {
    const s = scores[i.symbol]
    if (!s) return true
    return s.winProbability >= settings.minWinProbability
  })

  const topPicks = INSTRUMENTS
    .map(i => ({ instrument: i, score: scores[i.symbol] }))
    .filter(({ score }) => score && score.winProbability >= 68 && score.direction !== 'NEUTRAL')
    .sort((a, b) => b.score.winProbability - a.score.winProbability)
    .slice(0, 3)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">CFD Screener</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Risiko: {['','Sehr konservativ','Konservativ','Moderat','Aggressiv','Sehr aggressiv'][settings.riskLevel]} ·
            Max. Verlust: {settings.maxLossPercent}% · Min. Gewinnwahrsch.: {settings.minWinProbability}%
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${view === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
            Alle ({INSTRUMENTS.length})
          </button>
          <button onClick={() => setView('watchlist')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${view === 'watchlist' ? 'bg-yellow-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
            ★ Watchlist ({watchlist.length})
          </button>
        </div>
      </div>

      {/* Top Picks — only in "all" view */}
      {view === 'all' && topPicks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">⭐ Top Empfehlungen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topPicks.map(({ instrument }) => (
              <InstrumentCard
                key={instrument.symbol}
                instrument={instrument}
                quote={quotes[instrument.symbol]}
                score={scores[instrument.symbol]}
                stopLoss={stopLosses[instrument.symbol]}
                watched={isWatched(instrument.symbol)}
                onToggleWatch={() => toggle(instrument.symbol)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty watchlist */}
      {view === 'watchlist' && watchlist.length === 0 && (
        <div className="card text-center py-12 mb-4">
          <div className="text-4xl mb-3">☆</div>
          <div className="text-slate-300 font-medium mb-1">Watchlist ist leer</div>
          <div className="text-slate-500 text-sm">Öffne ein Instrument und klicke ★ um es hinzuzufügen.</div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        <input type="text" placeholder="Suche..." value={search} onChange={e => setSearch(e.target.value)}
          className="input max-w-[180px] text-sm" />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input max-w-[180px] text-sm">
          <option value="winProbability">Gewinnwahrsch. ↓</option>
          <option value="rsi">RSI ↑</option>
          <option value="change">Kursänderung ↓</option>
        </select>
        <button
          onClick={() => setOnlyOpen(v => !v)}
          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
            onlyOpen
              ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600'
              : 'bg-slate-700 text-slate-400 border-slate-600 hover:border-slate-500'
          }`}
        >
          {onlyOpen ? '● Nur offene Märkte' : '○ Alle Märkte'}
        </button>
        <button onClick={loadData} disabled={loading} className="btn-primary text-sm">
          {loading ? `⏳ ${loadedCount}/${INSTRUMENTS.length}` : '🔄 Aktualisieren'}
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
              category === c ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}>
            {c}
          </button>
        ))}
      </div>

      {/* Loading bar */}
      {loading && (
        <div className="mb-3 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(loadedCount / INSTRUMENTS.length) * 100}%` }} />
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sorted.map(i => (
          <InstrumentCard
            key={i.symbol}
            instrument={i}
            quote={quotes[i.symbol]}
            score={scores[i.symbol]}
            stopLoss={stopLosses[i.symbol]}
            watched={isWatched(i.symbol)}
            onToggleWatch={() => toggle(i.symbol)}
          />
        ))}
      </div>

      {sorted.length === 0 && !loading && watchlist.length > 0 && (
        <div className="text-center text-slate-500 py-12">
          Keine Instrumente gefunden. Passe die Filter an.
        </div>
      )}
    </div>
  )
}
