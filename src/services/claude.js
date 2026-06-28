const CLAUDE_URL = 'https://api.anthropic.com/v1/messages'

export async function analyzeMarket(apiKey, instrumentName, score, backtestResult, sr, pivots, projections, marketStats) {
  if (!apiKey) return null

  const srText = sr?.slice(0, 6).map(l =>
    `${l.type === 'resistance' ? 'Widerstand' : 'Unterstützung'}: ${l.price.toFixed(4)} (${l.distance > 0 ? '+' : ''}${l.distance.toFixed(2)}%)`
  ).join('\n') ?? 'keine Daten'

  const pivotsText = pivots
    ? `PP: ${pivots.PP.toFixed(4)} | R1: ${pivots.R1.toFixed(4)} | S1: ${pivots.S1.toFixed(4)}`
    : 'keine Daten'

  const projText = projections?.targets?.map(t =>
    `+${t.days}T: Basis ${t.base.toFixed(4)} (Bull ${t.bull.toFixed(4)} / Bear ${t.bear.toFixed(4)})`
  ).join('\n') ?? 'keine Daten'

  const prompt = `Du bist ein erfahrener CFD-Trader. Analysiere folgendes Instrument für einen Plus500 CFD Trade präzise auf Deutsch.

INSTRUMENT: ${instrumentName}
Aktueller Kurs: ${score.currentPrice?.toFixed(5)}
Signal: ${score.direction} | Gewinnwahrscheinlichkeit: ${score.winProbability}%
RSI: ${score.rsi?.toFixed(1)} | MACD: ${score.macd?.toFixed(5)} (Signal: ${score.macdSignal?.toFixed(5)})
Bollinger: Upper ${score.bb?.upper?.toFixed(4)} / Lower ${score.bb?.lower?.toFixed(4)}
SMA20: ${score.sma20?.toFixed(4)} | SMA50: ${score.sma50?.toFixed(4)}
ATR: ${score.atr?.toFixed(4)}
Trend: ${marketStats?.trend ?? '—'} | Volatilität: ${marketStats?.volatility30d?.toFixed(1)}% p.a.
52W Hoch: ${marketStats?.high52w?.toFixed(4)} (${marketStats?.fromHigh?.toFixed(1)}%) | Tief: ${marketStats?.low52w?.toFixed(4)}

SUPPORT & RESISTANCE:
${srText}

PIVOT-PUNKTE: ${pivotsText}

KURSPROGNOSEN (Lineare Regression):
Trendrichtung: ${projections?.trendDir === 'up' ? 'Aufwärts' : 'Abwärts'} | Stärke R²: ${((projections?.trendStrength ?? 0) * 100).toFixed(0)}%
${projText}

BACKTEST: ${backtestResult ? `Win-Rate ${backtestResult.winRate}% aus ${backtestResult.totalTrades} Trades` : 'Keine Daten'}
Technische Signale: ${score.signals?.map(s => s.label).join(', ') || 'keine'}

Antworte GENAU in diesem Format:
**Markteinschätzung:** [2-3 Sätze zur aktuellen Marktsituation]

**Wichtige Levels:**
- Nächster Widerstand: [Preis und Bedeutung]
- Nächste Unterstützung: [Preis und Bedeutung]
- Pivot-Punkt: [PP-Wert und ob Kurs darüber/darunter]

**Mögliche Kursverläufe:**
- Bull-Szenario: [konkretes Ziel mit Preis]
- Bear-Szenario: [konkretes Ziel mit Preis]
- Wahrscheinlichstes Szenario: [Einschätzung]

**Empfehlung:** [LONG/SHORT/ABWARTEN] — [kurze Begründung, max. 2 Sätze]

**Risiken:** [1-2 wichtigste Risiken]`

  try {
    const res = await fetch(CLAUDE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const msg = err?.error?.message ?? `HTTP ${res.status}`
      return `❌ Claude Fehler: ${msg}`
    }
    const data = await res.json()
    return data.content?.[0]?.text ?? '❌ Keine Antwort von Claude erhalten.'
  } catch (e) {
    return `❌ Verbindungsfehler: ${e.message}`
  }
}
