import { useState, useEffect } from 'react'

const IMPACT_COLOR = { High: 'text-red-400', Medium: 'text-yellow-400', Low: 'text-slate-400' }
const IMPACT_DOT = { High: 'bg-red-500', Medium: 'bg-yellow-500', Low: 'bg-slate-500' }

const CURRENCY_FLAG = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', CAD: '🇨🇦',
  AUD: '🇦🇺', CHF: '🇨🇭', CNY: '🇨🇳', NZD: '🇳🇿',
}

export default function Calendar() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // 'all' | 'High' | 'Medium'
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(null)
    // ForexFactory public calendar JSON
    const url = weekOffset === 0
      ? 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'
      : 'https://nfs.faireconomy.media/ff_calendar_nextweek.json'

    fetch('https://corsproxy.io/?url=' + encodeURIComponent(url))
      .then(r => r.json())
      .then(data => {
        setEvents(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(e => {
        setError('Kalender konnte nicht geladen werden. Bitte später versuchen.')
        setLoading(false)
      })
  }, [weekOffset])

  const filtered = events.filter(e => {
    if (filter === 'all') return true
    return e.impact === filter
  })

  // Group by date
  const grouped = {}
  filtered.forEach(ev => {
    const d = ev.date?.split('T')[0] ?? 'Unbekannt'
    if (!grouped[d]) grouped[d] = []
    grouped[d].push(ev)
  })

  function formatDate(str) {
    if (!str) return ''
    try {
      return new Date(str).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })
    } catch { return str }
  }

  function formatTime(str) {
    if (!str) return '—'
    try {
      const d = new Date(str)
      return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    } catch { return str }
  }

  const isToday = (dateStr) => {
    const today = new Date().toISOString().split('T')[0]
    return dateStr === today
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Wirtschaftskalender</h1>
          <p className="text-slate-400 text-xs mt-0.5">Wichtige Ereignisse, die CFD-Kurse bewegen können</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setWeekOffset(0)}
            className={`px-3 py-1.5 rounded text-xs font-medium ${weekOffset === 0 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
            Diese Woche
          </button>
          <button onClick={() => setWeekOffset(1)}
            className={`px-3 py-1.5 rounded text-xs font-medium ${weekOffset === 1 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
            Nächste Woche
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="card border-red-800/40 bg-red-950/20 mb-5">
        <p className="text-sm text-red-300">
          ⚠️ <strong>Wichtig für CFD-Trader:</strong> Offene Positionen vor roten Ereignissen (High Impact) schließen oder absichern.
          Kurse können innerhalb von Sekunden 1-3% springen.
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {[['all', 'Alle'], ['High', '🔴 Hoch'], ['Medium', '🟡 Mittel'], ['Low', '⚪ Niedrig']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded text-xs font-medium ${filter === val ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-lg" />)}
        </div>
      )}

      {error && (
        <div className="card border-red-800/40 text-red-400 text-sm">{error}</div>
      )}

      {!loading && !error && Object.keys(grouped).length === 0 && (
        <div className="card text-slate-500 text-center py-10">Keine Ereignisse gefunden.</div>
      )}

      {!loading && !error && Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, evs]) => (
        <div key={date} className="mb-5">
          <div className={`text-sm font-semibold mb-2 flex items-center gap-2 ${isToday(date) ? 'text-blue-400' : 'text-slate-400'}`}>
            {isToday(date) && <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">HEUTE</span>}
            {formatDate(date)}
          </div>
          <div className="space-y-2">
            {evs.map((ev, i) => (
              <div key={i} className={`card py-3 ${ev.impact === 'High' ? 'border-red-800/30' : ev.impact === 'Medium' ? 'border-yellow-800/20' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="text-xs text-slate-400 font-mono w-12 shrink-0 pt-0.5">
                    {formatTime(ev.date)}
                  </div>
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${IMPACT_DOT[ev.impact] ?? 'bg-slate-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{ev.title}</span>
                      <span className="text-xs text-slate-400">
                        {CURRENCY_FLAG[ev.country] ?? ''} {ev.country}
                      </span>
                      <span className={`text-xs font-medium ${IMPACT_COLOR[ev.impact] ?? 'text-slate-500'}`}>
                        {ev.impact === 'High' ? '🔴' : ev.impact === 'Medium' ? '🟡' : '⚪'} {ev.impact}
                      </span>
                    </div>
                    {(ev.forecast || ev.previous) && (
                      <div className="flex gap-4 mt-1 text-xs text-slate-500">
                        {ev.forecast && <span>Prognose: <span className="text-slate-300">{ev.forecast}</span></span>}
                        {ev.previous && <span>Vorherig: <span className="text-slate-400">{ev.previous}</span></span>}
                        {ev.actual && <span>Aktuell: <span className={parseFloat(ev.actual) > parseFloat(ev.forecast ?? ev.previous ?? '0') ? 'text-emerald-400' : 'text-red-400'}>{ev.actual}</span></span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-xs text-slate-600 mt-6 text-center">
        Datenquelle: ForexFactory · Zeiten in Lokalzeit · Keine Anlageberatung
      </p>
    </div>
  )
}
