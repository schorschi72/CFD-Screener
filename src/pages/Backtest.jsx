import { useState } from 'react'
import { INSTRUMENTS } from '../data/instruments'
import { fetchHistory } from '../services/yahooFinance'
import { scoreSignals, calcStopLoss, runBacktest } from '../services/technicalAnalysis'

export default function Backtest({ settings }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedRange, setSelectedRange] = useState('1y')

  async function runAll() {
    setLoading(true)
    setResults([])
    setProgress(0)
    const out = []

    for (let i = 0; i < INSTRUMENTS.length; i++) {
      const inst = INSTRUMENTS[i]
      try {
        const candles = await fetchHistory(inst.symbol, selectedRange, '1d')
        const score = scoreSignals(candles)
        const bt = runBacktest(candles, settings.riskLevel, settings.maxLossPercent)
        if (bt && bt.totalTrades >= 3) {
          out.push({
            instrument: inst,
            score,
            backtest: bt,
            stopLoss: score ? calcStopLoss(score, settings.riskLevel, settings.maxLossPercent) : null,
          })
        }
      } catch { /* skip */ }
      setProgress(i + 1)
    }

    out.sort((a, b) => b.backtest.winRate - a.backtest.winRate)
    setResults(out)
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-2">Backtest</h1>
      <p className="text-slate-400 text-sm mb-6">
        Testet die technische Analyse-Strategie auf historischen Daten aller Instrumente.
      </p>

      <div className="card mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Zeitraum</label>
            <select value={selectedRange} onChange={e => setSelectedRange(e.target.value)} className="input max-w-[140px]">
              <option value="3mo">3 Monate</option>
              <option value="6mo">6 Monate</option>
              <option value="1y">1 Jahr</option>
              <option value="2y">2 Jahre</option>
            </select>
          </div>
          <div className="text-sm text-slate-400">
            Risiko: {['','Sehr konservativ','Konservativ','Moderat','Aggressiv','Sehr aggressiv'][settings.riskLevel]} ·
            Max. Verlust: {settings.maxLossPercent}%
          </div>
          <button onClick={runAll} disabled={loading} className="btn-primary ml-auto">
            {loading ? `⏳ ${progress}/${INSTRUMENTS.length} Instrumente...` : '▶ Backtest starten'}
          </button>
        </div>

        {loading && (
          <div className="mt-3">
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(progress / INSTRUMENTS.length) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-semibold text-white">Ergebnisse</h2>
            <span className="text-xs text-slate-400">{results.length} Instrumente mit ausreichend Daten</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs border-b border-slate-700">
                  <th className="text-left py-2 pr-4">Instrument</th>
                  <th className="text-right py-2 px-2">Win-Rate</th>
                  <th className="text-right py-2 px-2">Trades</th>
                  <th className="text-right py-2 px-2">W / V</th>
                  <th className="text-right py-2 px-2">Signal</th>
                  <th className="text-right py-2 px-2">Gewinn%</th>
                  <th className="text-right py-2 px-2">Stop-Loss</th>
                </tr>
              </thead>
              <tbody>
                {results.map(({ instrument, score, backtest, stopLoss }) => (
                  <tr key={instrument.symbol} className="border-b border-slate-800 hover:bg-slate-800/40">
                    <td className="py-2 pr-4">
                      <div className="font-medium text-white">{instrument.name}</div>
                      <div className="text-xs text-slate-500">{instrument.category}</div>
                    </td>
                    <td className="text-right py-2 px-2">
                      <span className={`font-bold ${backtest.winRate >= 60 ? 'text-emerald-400' : backtest.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {backtest.winRate}%
                      </span>
                    </td>
                    <td className="text-right py-2 px-2 text-slate-300">{backtest.totalTrades}</td>
                    <td className="text-right py-2 px-2">
                      <span className="text-emerald-400">{backtest.wins}</span>
                      <span className="text-slate-500"> / </span>
                      <span className="text-red-400">{backtest.losses}</span>
                    </td>
                    <td className="text-right py-2 px-2">
                      {score ? (
                        <span className={score.direction === 'LONG' ? 'text-emerald-400' : score.direction === 'SHORT' ? 'text-red-400' : 'text-yellow-400'}>
                          {score.direction}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="text-right py-2 px-2 text-blue-400 font-medium">
                      {score?.winProbability ?? '—'}%
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-red-400 text-xs">
                      {stopLoss?.stopLoss?.toFixed(4) ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && results.length === 0 && (
        <div className="text-center text-slate-500 py-16">
          Klicke „Backtest starten" um alle Instrumente zu analysieren.
        </div>
      )}
    </div>
  )
}
