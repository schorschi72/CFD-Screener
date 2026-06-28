import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { INSTRUMENTS } from '../data/instruments'
import { fetchHistory, fetchQuote } from '../services/yahooFinance'
import {
  scoreSignals, calcStopLoss, runBacktest,
  findSupportResistance, calcPivotPoints, calcFibonacci,
  buildPriceProjections, calcMarketStats,
} from '../services/technicalAnalysis'
import { analyzeMarket } from '../services/claude'
import { useWatchlist } from '../store/watchlistStore'
import { useAlerts } from '../store/alertsStore'
import { useJournal } from '../store/journalStore'
import PriceChart from '../components/PriceChart'

const RANGES = ['1mo', '3mo', '6mo', '1y', '2y']
const INTERVALS = [{ label: '1T', value: '1d' }, { label: '4H', value: '60m' }, { label: '1H', value: '30m' }]

export default function InstrumentDetail({ settings }) {
  const { symbol } = useParams()
  const navigate = useNavigate()
  const instrument = INSTRUMENTS.find(i => i.symbol === symbol)
  const { isWatched, toggle } = useWatchlist()
  const { addAlert, alerts, deleteAlert } = useAlerts()
  const { addTrade } = useJournal()

  const [candles, setCandles] = useState([])
  const [quote, setQuote] = useState(null)
  const [score, setScore] = useState(null)
  const [stopLoss, setStopLoss] = useState(null)
  const [backtest, setBacktest] = useState(null)
  const [sr, setSR] = useState([])
  const [pivots, setPivots] = useState(null)
  const [fibonacci, setFibonacci] = useState([])
  const [projections, setProjections] = useState(null)
  const [marketStats, setMarketStats] = useState(null)
  const [aiText, setAiText] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [range, setRange] = useState('6mo')
  const [interval, setInterval] = useState('1d')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Chart overlay toggles
  const [showSR, setShowSR] = useState(true)
  const [showPivots, setShowPivots] = useState(false)
  const [showFib, setShowFib] = useState(false)

  // Position size calculator
  const [accountBalance, setAccountBalance] = useState(() => parseFloat(localStorage.getItem('plus500_balance') ?? '10000'))
  const [riskPct, setRiskPct] = useState(settings.maxLossPercent)

  // Alert form
  const [alertPrice, setAlertPrice] = useState('')
  const [alertDir, setAlertDir] = useState('above')

  useEffect(() => {
    if (!instrument) return
    setLoading(true)
    setScore(null); setSR([]); setPivots(null); setFibonacci([]); setProjections(null)
    Promise.all([fetchHistory(symbol, range, interval), fetchQuote(symbol)])
      .then(([hist, q]) => {
        setCandles(hist)
        setQuote(q)
        const s = scoreSignals(hist)
        setScore(s)
        if (s) setStopLoss(calcStopLoss(s, settings.riskLevel, settings.maxLossPercent))
        setBacktest(runBacktest(hist, settings.riskLevel, settings.maxLossPercent))
        setSR(findSupportResistance(hist))
        setPivots(calcPivotPoints(hist))
        setFibonacci(calcFibonacci(hist))
        setProjections(buildPriceProjections(hist, settings.holdingDays))
        setMarketStats(calcMarketStats(hist))
      })
      .finally(() => setLoading(false))
  }, [symbol, range, interval, settings.riskLevel, settings.maxLossPercent, settings.holdingDays])

  async function runAI() {
    if (!settings.claudeApiKey || !score) return
    setAiLoading(true)
    const text = await analyzeMarket(settings.claudeApiKey, instrument.name, score, backtest, sr, pivots, projections, marketStats)
    setAiText(text)
    setAiLoading(false)
  }

  if (!instrument) return (
    <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400">
      Nicht gefunden. <button onClick={() => navigate('/')} className="text-blue-400 underline">Zurück</button>
    </div>
  )

  const change = quote?.changePercent ?? 0
  const isUp = change >= 0
  const watched = isWatched(symbol)

  const tabs = ['overview', 'position', 'sr', 'projections', 'backtest', 'alerts', 'ai']
  const tabLabel = { overview: 'Übersicht', position: '📐 Position', sr: 'S&R / Fib', projections: 'Prognosen', backtest: 'Backtest', alerts: '🔔 Alarme', ai: 'KI' }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white text-sm mb-4 flex items-center gap-1">
        ← Screener
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{instrument.name}</h1>
            <button
              onClick={() => toggle(symbol)}
              className={`text-xl transition-transform active:scale-90 ${watched ? 'text-yellow-400' : 'text-slate-600 hover:text-yellow-400'}`}
              title={watched ? 'Aus Watchlist entfernen' : 'Zur Watchlist hinzufügen'}
            >
              {watched ? '★' : '☆'}
            </button>
          </div>
          <div className="text-slate-400 text-sm">{instrument.category} · {symbol}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-bold text-white">
            {quote?.price?.toFixed(instrument.pip < 0.001 ? 5 : instrument.pip < 0.1 ? 4 : 2) ?? '—'}
          </div>
          <div className={`text-sm font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {isUp ? '+' : ''}{change.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Interval + Range + Chart overlays */}
      <div className="flex flex-wrap gap-2 mb-1 items-center">
        <div className="flex gap-1 bg-slate-800 rounded p-0.5">
          {INTERVALS.map(iv => (
            <button key={iv.value} onClick={() => setInterval(iv.value)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${interval === iv.value ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {iv.label}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-slate-700" />
        {RANGES.map(r => (
          <button key={r} onClick={() => setRange(r)}
            className={`px-2.5 py-1 rounded text-xs font-medium ${range === r ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >{r}</button>
        ))}
        <div className="ml-auto flex gap-2">
          <ToggleChip active={showSR} onClick={() => setShowSR(v => !v)} color="cyan">S&R</ToggleChip>
          <ToggleChip active={showPivots} onClick={() => setShowPivots(v => !v)} color="purple">Pivot</ToggleChip>
          <ToggleChip active={showFib} onClick={() => setShowFib(v => !v)} color="yellow">Fib</ToggleChip>
        </div>
      </div>

      {/* Chart */}
      <div className="card mb-4">
        {loading ? <div className="skeleton rounded-lg" style={{ height: 340 }} /> : (
          <PriceChart
            candles={candles}
            tradeSetup={stopLoss}
            supportResistance={sr}
            pivots={pivots}
            fibonacci={fibonacci}
            showSR={showSR}
            showPivots={showPivots}
            showFib={showFib}
          />
        )}
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
          {showSR && <><span className="text-orange-400">■</span> Widerstand <span className="text-cyan-400">■</span> Unterstützung</>}
          {showPivots && <><span className="text-purple-400">■</span> Pivot-Punkte</>}
          {showFib && <><span className="text-yellow-400">■</span> Fibonacci</>}
          {stopLoss && <><span className="text-blue-400">■</span> Entry <span className="text-red-400">■</span> SL <span className="text-emerald-400">■</span> TP</>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === t ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}>
            {tabLabel[t]}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <h2 className="font-semibold text-white mb-3">Technische Analyse</h2>
            {score ? (
              <div className="space-y-2 text-sm">
                <Row label="Signal" value={<DirBadge dir={score.direction} />} />
                <Row label="Gewinnwahrsch." value={<span className="font-bold text-blue-400">{score.winProbability}%</span>} />
                <Row label="RSI (14)" value={<RsiDisplay value={score.rsi} />} />
                <Row label="MACD" value={<span className={score.macdHist > 0 ? 'text-emerald-400' : 'text-red-400'}>{score.macd?.toFixed(5)}</span>} />
                <Row label="SMA 20" value={score.sma20?.toFixed(4)} />
                <Row label="SMA 50" value={score.sma50?.toFixed(4)} />
                <Row label="ATR (14)" value={`${score.atr?.toFixed(4)} (${((score.atr / score.currentPrice) * 100).toFixed(2)}%)`} />
                {score.adx != null && (
                  <Row label="ADX (14)" value={
                    <span className={score.adx > 50 ? 'text-emerald-400' : score.adx > 25 ? 'text-yellow-400' : 'text-red-400'}>
                      {score.adx.toFixed(1)} {score.adx > 25 ? '(Trend aktiv)' : '(Seitwärts)'}
                    </span>
                  } />
                )}
                <div className="pt-2 border-t border-slate-700">
                  <div className="text-slate-400 text-xs mb-1">Aktive Signale:</div>
                  <div className="flex flex-wrap gap-1">
                    {score.signals.map((s, i) => (
                      <span key={i} className={s.type === 'bull' ? 'badge-green' : 'badge-red'}>{s.label}</span>
                    ))}
                    {score.signals.length === 0 && <span className="text-slate-500 text-xs">Keine starken Signale</span>}
                  </div>
                </div>
              </div>
            ) : <Skeleton />}
          </div>

          <div className="space-y-4">
            <div className="card">
              <h2 className="font-semibold text-white mb-3">Trade Setup (CFD)</h2>
              {stopLoss ? (
                <div className="space-y-3">
                  <TradeRow label="Einstiegspreis" value={stopLoss.entryPrice?.toFixed(4)} color="text-blue-400" />
                  <TradeRow label="Stop-Loss" value={stopLoss.stopLoss?.toFixed(4)} color="text-red-400"
                    sub={`-${stopLoss.stopPercent?.toFixed(2)}%`} />
                  <TradeRow label="Take-Profit" value={stopLoss.takeProfit?.toFixed(4)} color="text-emerald-400"
                    sub={`RRR 1:${stopLoss.riskReward}`} />
                  <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">
                    {['','Sehr konservativ','Konservativ','Moderat','Aggressiv','Sehr aggressiv'][settings.riskLevel]} ·
                    Max. {settings.maxLossPercent}% Verlust
                  </div>
                </div>
              ) : <Skeleton />}
            </div>

            {marketStats && (
              <div className="card">
                <h2 className="font-semibold text-white mb-3">Markt-Statistiken</h2>
                <div className="space-y-2 text-sm">
                  <Row label="Trend" value={<span className={marketStats.trend.includes('Aufwärts') ? 'text-emerald-400' : marketStats.trend.includes('Abwärts') ? 'text-red-400' : 'text-yellow-400'}>{marketStats.trend}</span>} />
                  <Row label="52W Hoch" value={<span className="text-orange-400">{marketStats.high52w?.toFixed(4)}</span>} />
                  <Row label="52W Tief" value={<span className="text-cyan-400">{marketStats.low52w?.toFixed(4)}</span>} />
                  <Row label="Abstand 52W Hoch" value={<span className={marketStats.fromHigh < -10 ? 'text-emerald-400' : 'text-slate-300'}>{marketStats.fromHigh?.toFixed(2)}%</span>} />
                  <Row label="Volatilität (30d)" value={`${marketStats.volatility30d?.toFixed(1)}% p.a.`} />
                  {marketStats.volumeRatio != null && (
                    <Row label="Volumen vs Ø" value={
                      <span className={marketStats.volumeRatio > 1.5 ? 'text-emerald-400' : marketStats.volumeRatio < 0.5 ? 'text-red-400' : 'text-slate-300'}>
                        {(marketStats.volumeRatio * 100).toFixed(0)}%
                      </span>
                    } />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: S&R / Fibonacci */}
      {activeTab === 'sr' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <h2 className="font-semibold text-white mb-3">Unterstützungen & Widerstände</h2>
            {sr.length ? (
              <div className="space-y-2">
                {sr.map((lvl, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${lvl.type === 'resistance' ? 'bg-orange-400' : 'bg-cyan-400'}`} />
                      <span className={lvl.type === 'resistance' ? 'text-orange-400' : 'text-cyan-400'}>
                        {lvl.type === 'resistance' ? 'Widerstand' : 'Unterstützung'}
                      </span>
                    </div>
                    <span className="font-mono text-white">{lvl.price.toFixed(4)}</span>
                    <span className={`text-xs ${lvl.distance > 0 ? 'text-orange-300' : 'text-cyan-300'}`}>
                      {lvl.distance > 0 ? '+' : ''}{lvl.distance.toFixed(2)}%
                    </span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: Math.min(lvl.strength, 4) }).map((_, j) => (
                        <div key={j} className="w-1.5 h-3 bg-slate-500 rounded-sm" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : <Skeleton />}
          </div>

          <div className="space-y-4">
            <div className="card">
              <h2 className="font-semibold text-white mb-3">Pivot-Punkte (Klassisch)</h2>
              {pivots ? (
                <div className="space-y-1.5 text-sm">
                  {[['R3','text-red-300'], ['R2','text-red-400'], ['R1','text-orange-400'], ['PP','text-purple-400'], ['S1','text-cyan-400'], ['S2','text-blue-400'], ['S3','text-blue-300']].map(([key, color]) => (
                    <div key={key} className="flex justify-between">
                      <span className={`font-medium ${color}`}>{key}</span>
                      <span className="font-mono text-white">{pivots[key]?.toFixed(4)}</span>
                      <span className="text-xs text-slate-500">
                        {pivots[key] ? `${(((pivots[key] - score?.currentPrice) / score?.currentPrice) * 100).toFixed(2)}%` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : <Skeleton />}
            </div>

            <div className="card">
              <h2 className="font-semibold text-white mb-3">Fibonacci Retracement</h2>
              {fibonacci.length ? (
                <div className="space-y-1.5 text-sm">
                  {fibonacci.map((fib, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-slate-400">{fib.label}</span>
                      <span className="font-mono text-white">{fib.price.toFixed(4)}</span>
                      <span className="text-xs text-slate-500">
                        {`${(((fib.price - score?.currentPrice) / score?.currentPrice) * 100).toFixed(2)}%`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : <Skeleton />}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Projections */}
      {activeTab === 'projections' && (
        <div className="space-y-4">
          {projections ? (
            <>
              <div className="card">
                <h2 className="font-semibold text-white mb-1">Trendanalyse</h2>
                <p className="text-slate-400 text-xs mb-4">Lineare Regression der letzten 60 Tage</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <Stat label="Trendrichtung" value={projections.trendDir === 'up' ? '▲ Aufwärts' : '▼ Abwärts'}
                    color={projections.trendDir === 'up' ? 'text-emerald-400' : 'text-red-400'} />
                  <Stat label="Trendstärke (R²)" value={`${(projections.trendStrength * 100).toFixed(0)}%`}
                    color={projections.trendStrength > 0.6 ? 'text-emerald-400' : 'text-yellow-400'} />
                  <Stat label="Tagesbewegung Ø" value={projections.dailyMoveExpected?.toFixed(4)} color="text-blue-400" />
                  <Stat label="Bewegung %" value={`${projections.dailyMovePercent?.toFixed(2)}%`} color="text-blue-400" />
                </div>
              </div>

              <div className="card">
                <h2 className="font-semibold text-white mb-1">Kursprognosen</h2>
                <p className="text-slate-400 text-xs mb-4">
                  Basierend auf linearer Regression + ATR-Bandbreite. <span className="text-yellow-400">Keine Garantie auf Richtigkeit.</span>
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 text-xs border-b border-slate-700">
                        <th className="text-left py-2 pr-4">Zeitraum</th>
                        <th className="text-right py-2 px-2">Basis</th>
                        <th className="text-right py-2 px-2">Bullen-Szenario</th>
                        <th className="text-right py-2 px-2">Bären-Szenario</th>
                        <th className="text-right py-2 px-2">Trend-Prognose</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projections.targets.map(t => (
                        <tr key={t.days} className="border-b border-slate-800">
                          <td className="py-2 pr-4 text-slate-300">{t.days === 1 ? 'Morgen' : `+${t.days} Tage`}</td>
                          <td className="text-right py-2 px-2 font-mono text-slate-200">{t.base.toFixed(4)}</td>
                          <td className="text-right py-2 px-2 font-mono text-emerald-400">{t.bull.toFixed(4)}</td>
                          <td className="text-right py-2 px-2 font-mono text-red-400">{t.bear.toFixed(4)}</td>
                          <td className="text-right py-2 px-2">
                            <span className={`font-medium text-xs ${t.changePercent > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {t.changePercent > 0 ? '+' : ''}{t.changePercent.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-slate-600 text-xs mt-3">
                  Bullen-Szenario = Trend + 1× ATR · Bären-Szenario = Trend − 1× ATR. Nicht als Anlageempfehlung zu verstehen.
                </p>
              </div>

              {score && (
                <div className="card">
                  <h2 className="font-semibold text-white mb-3">Szenario-Analyse</h2>
                  <div className="space-y-3">
                    <ScenarioBar
                      label="Stark bullisch (Ausbruch über Widerstand)"
                      probability={Math.max(5, score.winProbability - 20)}
                      color="bg-emerald-600"
                      description={sr.filter(l => l.type === 'resistance')[0] ? `Ziel: ${sr.filter(l => l.type === 'resistance')[0].price.toFixed(4)}` : ''}
                    />
                    <ScenarioBar
                      label="Leicht bullisch (Trend fortsetzung)"
                      probability={Math.min(40, score.winProbability)}
                      color="bg-emerald-500/60"
                      description="Graduelle Bewegung in Trendrichtung"
                    />
                    <ScenarioBar
                      label="Seitwärts (Konsolidierung)"
                      probability={Math.max(10, 50 - Math.abs(score.winProbability - 50))}
                      color="bg-yellow-500/60"
                      description="Kurs verbleibt in aktueller Range"
                    />
                    <ScenarioBar
                      label="Rückgang (Stop-Loss Risiko)"
                      probability={Math.max(5, 100 - score.winProbability)}
                      color="bg-red-500/60"
                      description={stopLoss ? `SL bei ${stopLoss.stopLoss?.toFixed(4)}` : ''}
                    />
                  </div>
                </div>
              )}
            </>
          ) : <Skeleton />}
        </div>
      )}

      {/* Tab: Backtest */}
      {activeTab === 'backtest' && (
        <div className="space-y-4">
          {backtest ? (
            <>
              <div className="card">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <Stat label="Trades gesamt" value={backtest.totalTrades} />
                  <Stat label="Win-Rate" value={`${backtest.winRate}%`} color={backtest.winRate >= 55 ? 'text-emerald-400' : 'text-red-400'} />
                  <Stat label="Gewinne" value={backtest.wins} color="text-emerald-400" />
                  <Stat label="Verluste" value={backtest.losses} color="text-red-400" />
                </div>
                <div className="mt-4 h-2 bg-red-900/40 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${backtest.winRate}%` }} />
                </div>
              </div>

              <div className="card">
                <h2 className="font-semibold text-white mb-3">Letzte Trades</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700">
                        <th className="text-left py-2 pr-3">Richtung</th>
                        <th className="text-right py-2 px-2">Entry</th>
                        <th className="text-right py-2 px-2">Exit</th>
                        <th className="text-right py-2 px-2">P&L</th>
                        <th className="text-right py-2 px-2">Grund</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backtest.trades.slice(-15).reverse().map((t, i) => (
                        <tr key={i} className="border-b border-slate-800">
                          <td className={`py-1.5 pr-3 font-medium ${t.direction === 'LONG' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {t.direction === 'LONG' ? '▲' : '▼'} {t.direction}
                          </td>
                          <td className="text-right py-1.5 px-2 font-mono">{t.entry.toFixed(4)}</td>
                          <td className="text-right py-1.5 px-2 font-mono">{t.exitPrice.toFixed(4)}</td>
                          <td className={`text-right py-1.5 px-2 font-mono font-medium ${t.pnl > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {t.pnl > 0 ? '+' : ''}{t.pnl.toFixed(4)}
                          </td>
                          <td className="text-right py-1.5 px-2 text-slate-400">{t.exitReason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="card text-slate-400 text-center py-8">
              Nicht genug Daten für Backtest. Wähle einen längeren Zeitraum.
            </div>
          )}
        </div>
      )}

      {/* Tab: Position Size Calculator */}
      {activeTab === 'position' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-white mb-1">Positions-Größen-Rechner</h2>
            <p className="text-slate-400 text-xs mb-4">Wie viele Kontrakte darf ich kaufen, ohne mein Risiko-Limit zu überschreiten?</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Kontostand (€)</label>
                <input type="number" value={accountBalance}
                  onChange={e => { setAccountBalance(+e.target.value); localStorage.setItem('plus500_balance', e.target.value) }}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Risiko pro Trade (%)</label>
                <input type="number" step="0.1" min="0.1" max="10" value={riskPct}
                  onChange={e => setRiskPct(+e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm" />
              </div>
            </div>
            {stopLoss ? (() => {
              const riskAmount = accountBalance * (riskPct / 100)
              const stopDist = Math.abs(stopLoss.entryPrice - stopLoss.stopLoss)
              const positionSize = stopDist > 0 ? riskAmount / stopDist : 0
              const notional = positionSize * stopLoss.entryPrice
              const rrAmount = riskAmount * stopLoss.riskReward
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-slate-700/40 rounded-lg p-3">
                      <div className="text-red-400 font-bold text-xl">{riskAmount.toFixed(0)} €</div>
                      <div className="text-slate-400 text-xs mt-1">Max. Risiko</div>
                    </div>
                    <div className="bg-slate-700/40 rounded-lg p-3">
                      <div className="text-blue-400 font-bold text-xl">{positionSize.toFixed(2)}</div>
                      <div className="text-slate-400 text-xs mt-1">Kontrakte</div>
                    </div>
                    <div className="bg-slate-700/40 rounded-lg p-3">
                      <div className="text-slate-200 font-bold text-xl">{notional.toFixed(0)} €</div>
                      <div className="text-slate-400 text-xs mt-1">Positionswert</div>
                    </div>
                    <div className="bg-slate-700/40 rounded-lg p-3">
                      <div className="text-emerald-400 font-bold text-xl">{rrAmount.toFixed(0)} €</div>
                      <div className="text-slate-400 text-xs mt-1">Zielgewinn (1:{stopLoss.riskReward})</div>
                    </div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-sm space-y-1.5">
                    <div className="flex justify-between"><span className="text-slate-400">Entry</span><span className="font-mono text-blue-400">{stopLoss.entryPrice.toFixed(4)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Stop-Loss</span><span className="font-mono text-red-400">{stopLoss.stopLoss.toFixed(4)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Take-Profit</span><span className="font-mono text-emerald-400">{stopLoss.takeProfit.toFixed(4)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Stop-Distanz</span><span className="font-mono text-slate-300">{stopDist.toFixed(4)}</span></div>
                  </div>
                  <button onClick={() => {
                    addTrade({
                      symbol, name: instrument.name,
                      direction: score.direction,
                      entry: stopLoss.entryPrice,
                      sl: stopLoss.stopLoss,
                      tp: stopLoss.takeProfit,
                      size: +positionSize.toFixed(2),
                      notes: `App-Signal: ${score.direction} ${score.winProbability}% | ADX ${score.adx?.toFixed(0) ?? '—'}`,
                      status: 'open',
                    })
                    alert('Trade ins Journal eingetragen!')
                  }} className="btn-primary text-sm w-full">
                    📓 Trade ins Journal eintragen
                  </button>
                </div>
              )
            })() : <div className="text-slate-500 text-sm">Warte auf Signals-Berechnung...</div>}
          </div>

          {score && (
            <div className="card">
              <h2 className="font-semibold text-white mb-3">ADX — Trendstärke</h2>
              {score.adx != null ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">ADX (14)</span>
                    <span className={`font-bold text-lg ${score.adx > 50 ? 'text-emerald-400' : score.adx > 25 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {score.adx.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${score.adx > 50 ? 'bg-emerald-500' : score.adx > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(score.adx, 100)}%` }} />
                  </div>
                  <div className="text-sm">
                    {score.adx > 50 && <span className="text-emerald-400">✅ Sehr starker Trend — Signal zuverlässig</span>}
                    {score.adx > 25 && score.adx <= 50 && <span className="text-yellow-400">⚡ Mäßig starker Trend — Signal beachten</span>}
                    {score.adx <= 25 && <span className="text-red-400">⚠️ Schwacher Trend / Seitwärts — Signal vorsichtig werten</span>}
                  </div>
                  <div className="text-xs text-slate-500">ADX &lt; 25 = kein klarer Trend · 25–50 = Trend vorhanden · &gt; 50 = starker Trend</div>
                </div>
              ) : <div className="text-slate-500 text-sm">Nicht genug Daten für ADX.</div>}
            </div>
          )}
        </div>
      )}

      {/* Tab: Alerts */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-white mb-3">Preisalarm setzen</h2>
            <div className="flex gap-3 items-end flex-wrap">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Alarm bei Preis</label>
                <input type="number" step="any" value={alertPrice}
                  onChange={e => setAlertPrice(e.target.value)}
                  placeholder={quote?.price?.toFixed(4) ?? '—'}
                  className="w-40 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Richtung</label>
                <select value={alertDir} onChange={e => setAlertDir(e.target.value)}
                  className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm">
                  <option value="above">≥ steigt über</option>
                  <option value="below">≤ fällt unter</option>
                </select>
              </div>
              <button onClick={() => {
                if (!alertPrice) return
                addAlert({ symbol, name: instrument.name, targetPrice: parseFloat(alertPrice), direction: alertDir })
                setAlertPrice('')
              }} className="btn-primary text-sm">
                🔔 Alarm setzen
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold text-white mb-3">Aktive Alarme für {instrument.name}</h2>
            {alerts.filter(a => a.symbol === symbol).length === 0 ? (
              <div className="text-slate-500 text-sm">Noch keine Alarme gesetzt.</div>
            ) : (
              <div className="space-y-2">
                {alerts.filter(a => a.symbol === symbol).map(a => (
                  <div key={a.id} className={`flex items-center justify-between p-3 rounded-lg ${a.triggered ? 'bg-emerald-950/30 border border-emerald-800/30' : 'bg-slate-800'}`}>
                    <div className="text-sm">
                      <span className={a.triggered ? 'text-emerald-400' : 'text-slate-300'}>
                        {a.triggered ? '✅ Ausgelöst' : '⏳ Wartet'} —
                      </span>
                      {' '}Preis {a.direction === 'above' ? '≥' : '≤'}{' '}
                      <span className="font-mono text-white">{a.targetPrice}</span>
                    </div>
                    <button onClick={() => deleteAlert(a.id)} className="text-slate-500 hover:text-red-400 text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: AI */}
      {activeTab === 'ai' && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-white">KI-Marktanalyse</h2>
              <p className="text-slate-500 text-xs">Powered by Google Gemini</p>
            </div>
            <button onClick={runAI} disabled={aiLoading || !settings.claudeApiKey} className="btn-primary text-sm"
              title={!settings.claudeApiKey ? 'API Key in Einstellungen hinterlegen' : ''}>
              {aiLoading ? '⏳ Analysiere...' : '🤖 Jetzt analysieren'}
            </button>
          </div>
          {!settings.claudeApiKey && (
            <p className="text-slate-500 text-sm">Bitte Gemini API Key in den <a href="#/settings" className="text-blue-400 underline">Einstellungen</a> hinterlegen.</p>
          )}
          {aiText ? (
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-900 rounded-lg p-4 border border-slate-700 mt-2">
              {aiText}
            </div>
          ) : settings.claudeApiKey && (
            <p className="text-slate-500 text-sm mt-2">Klicke „Jetzt analysieren" für eine KI-Einschätzung basierend auf den aktuellen technischen Signalen.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  )
}

function TradeRow({ label, value, color, sub }) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <div className="text-slate-400 text-xs">{label}</div>
        {sub && <div className="text-slate-500 text-xs">{sub}</div>}
      </div>
      <span className={`font-mono font-semibold text-base ${color}`}>{value}</span>
    </div>
  )
}

function Stat({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-slate-700/40 rounded-lg p-3">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-slate-400 text-xs mt-1">{label}</div>
    </div>
  )
}

function DirBadge({ dir }) {
  if (dir === 'LONG') return <span className="badge-green font-bold">▲ LONG</span>
  if (dir === 'SHORT') return <span className="badge-red font-bold">▼ SHORT</span>
  return <span className="badge-yellow">→ NEUTRAL</span>
}

function RsiDisplay({ value }) {
  if (value == null) return <span className="text-slate-500">—</span>
  const color = value < 30 ? 'text-emerald-400' : value > 70 ? 'text-red-400' : 'text-slate-200'
  const label = value < 30 ? ' (überverkauft)' : value > 70 ? ' (überkauft)' : ''
  return <span className={`font-mono ${color}`}>{value.toFixed(1)}{label}</span>
}

function ToggleChip({ active, onClick, color, children }) {
  const colors = {
    cyan: active ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500' : 'bg-slate-700 text-slate-500 border-slate-600',
    purple: active ? 'bg-purple-500/20 text-purple-400 border-purple-500' : 'bg-slate-700 text-slate-500 border-slate-600',
    yellow: active ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500' : 'bg-slate-700 text-slate-500 border-slate-600',
  }
  return (
    <button onClick={onClick} className={`px-2 py-0.5 rounded text-xs font-medium border transition-all ${colors[color]}`}>
      {children}
    </button>
  )
}

function ScenarioBar({ label, probability, color, description }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-300">{label}</span>
        <div className="flex items-center gap-2">
          {description && <span className="text-slate-500">{description}</span>}
          <span className="font-medium text-slate-200">{probability}%</span>
        </div>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${probability}%` }} />
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[1,2,3,4].map(i => <div key={i} className="skeleton h-4 rounded" />)}
    </div>
  )
}
