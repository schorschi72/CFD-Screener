import { useState } from 'react'
import { useJournal } from '../store/journalStore'
import { INSTRUMENTS } from '../data/instruments'

export default function Journal() {
  const { trades, open, closed, totalPnl, wins, winRate, addTrade, closeTrade, deleteTrade } = useJournal()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ symbol: '', direction: 'LONG', entry: '', size: '', sl: '', tp: '', notes: '' })
  const [closingId, setClosingId] = useState(null)
  const [exitPrice, setExitPrice] = useState('')
  const [tab, setTab] = useState('open')

  function submitTrade(e) {
    e.preventDefault()
    const inst = INSTRUMENTS.find(i => i.symbol === form.symbol)
    addTrade({
      symbol: form.symbol,
      name: inst?.name ?? form.symbol,
      direction: form.direction,
      entry: parseFloat(form.entry),
      size: parseFloat(form.size) || 1,
      sl: parseFloat(form.sl) || null,
      tp: parseFloat(form.tp) || null,
      notes: form.notes,
      status: 'open',
    })
    setForm({ symbol: '', direction: 'LONG', entry: '', size: '', sl: '', tp: '', notes: '' })
    setShowForm(false)
  }

  function submitClose(e) {
    e.preventDefault()
    closeTrade(closingId, parseFloat(exitPrice))
    setClosingId(null)
    setExitPrice('')
  }

  const displayed = tab === 'open' ? open : closed

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Trade Journal</h1>
          <p className="text-slate-400 text-xs mt-0.5">Verfolge deine CFD-Trades und analysiere deine Performance</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary text-sm">
          {showForm ? '✕ Abbrechen' : '+ Neuer Trade'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Offene Trades" value={open.length} color="text-blue-400" />
        <StatCard label="Abgeschlossen" value={closed.length} color="text-slate-300" />
        <StatCard label="Win-Rate" value={`${winRate}%`} color={winRate >= 50 ? 'text-emerald-400' : 'text-red-400'} />
        <StatCard label="Gesamt P&L" value={`${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}`}
          color={totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'} />
      </div>

      {/* New Trade Form */}
      {showForm && (
        <form onSubmit={submitTrade} className="card mb-5">
          <h2 className="font-semibold text-white mb-4">Trade erfassen</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Instrument</label>
              <select value={form.symbol} onChange={e => setForm(p => ({ ...p, symbol: e.target.value }))}
                required className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white">
                <option value="">— wählen —</option>
                {INSTRUMENTS.map(i => <option key={i.symbol} value={i.symbol}>{i.name} ({i.symbol})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Richtung</label>
              <select value={form.direction} onChange={e => setForm(p => ({ ...p, direction: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white">
                <option value="LONG">▲ LONG</option>
                <option value="SHORT">▼ SHORT</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Einstiegspreis</label>
              <input type="number" step="any" required value={form.entry}
                onChange={e => setForm(p => ({ ...p, entry: e.target.value }))}
                placeholder="z.B. 4096.30"
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Positionsgröße (Kontrakte)</label>
              <input type="number" step="any" value={form.size}
                onChange={e => setForm(p => ({ ...p, size: e.target.value }))}
                placeholder="z.B. 1"
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Stop-Loss</label>
              <input type="number" step="any" value={form.sl}
                onChange={e => setForm(p => ({ ...p, sl: e.target.value }))}
                placeholder="optional"
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Take-Profit</label>
              <input type="number" step="any" value={form.tp}
                onChange={e => setForm(p => ({ ...p, tp: e.target.value }))}
                placeholder="optional"
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs text-slate-400 mb-1 block">Notizen</label>
            <input type="text" value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Begründung, Setup, Marktlage..."
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" />
          </div>
          <button type="submit" className="btn-primary text-sm">Trade speichern</button>
        </form>
      )}

      {/* Close Trade Form */}
      {closingId && (
        <form onSubmit={submitClose} className="card mb-5 border-yellow-500/30">
          <h2 className="font-semibold text-yellow-400 mb-3">Trade schließen</h2>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Ausstiegspreis</label>
              <input type="number" step="any" required value={exitPrice}
                onChange={e => setExitPrice(e.target.value)}
                placeholder="Aktueller Kurs"
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" />
            </div>
            <button type="submit" className="btn-primary text-sm">Schließen</button>
            <button type="button" onClick={() => setClosingId(null)} className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded text-sm">
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {['open', 'closed'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tab === t ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
            {t === 'open' ? `Offen (${open.length})` : `Geschlossen (${closed.length})`}
          </button>
        ))}
      </div>

      {/* Trade List */}
      {displayed.length === 0 ? (
        <div className="card text-center text-slate-500 py-10">
          {tab === 'open' ? 'Keine offenen Trades. Klicke „Neuer Trade".' : 'Noch keine abgeschlossenen Trades.'}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(t => (
            <div key={t.id} className={`card border ${t.status === 'open' ? 'border-slate-700' : (t.pnl ?? 0) >= 0 ? 'border-emerald-800/40' : 'border-red-800/40'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-bold text-sm ${t.direction === 'LONG' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.direction === 'LONG' ? '▲' : '▼'} {t.direction}
                  </span>
                  <span className="text-white font-semibold">{t.name}</span>
                  <span className="text-slate-500 text-xs">{t.symbol}</span>
                  <span className="text-slate-500 text-xs">{new Date(t.date).toLocaleDateString('de-DE')}</span>
                </div>
                <div className="flex items-center gap-2">
                  {t.status === 'open' && (
                    <button onClick={() => { setClosingId(t.id); setExitPrice('') }}
                      className="text-xs px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded border border-yellow-600/30 hover:bg-yellow-600/30">
                      Schließen
                    </button>
                  )}
                  {t.status === 'closed' && (
                    <span className={`text-sm font-mono font-bold ${(t.pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {(t.pnl ?? 0) >= 0 ? '+' : ''}{t.pnl?.toFixed(4)}
                    </span>
                  )}
                  <button onClick={() => deleteTrade(t.id)}
                    className="text-xs text-slate-600 hover:text-red-400 transition-colors">✕</button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                <span>Entry: <span className="font-mono text-blue-400">{t.entry}</span></span>
                <span>Größe: <span className="text-slate-300">{t.size ?? 1}×</span></span>
                {t.sl && <span>SL: <span className="font-mono text-red-400">{t.sl}</span></span>}
                {t.tp && <span>TP: <span className="font-mono text-emerald-400">{t.tp}</span></span>}
                {t.exitPrice && <span>Exit: <span className="font-mono text-slate-300">{t.exitPrice}</span></span>}
              </div>
              {t.notes && <div className="mt-1.5 text-xs text-slate-500 italic">"{t.notes}"</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="card text-center py-3">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-slate-500 text-xs mt-1">{label}</div>
    </div>
  )
}
