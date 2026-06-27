// ─── Core Indicators ────────────────────────────────────────────────────────

export function calcSMA(closes, period) {
  const result = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(null); continue }
    const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    result.push(sum / period)
  }
  return result
}

export function calcEMA(closes, period) {
  const k = 2 / (period + 1)
  const result = []
  let ema = null
  for (let i = 0; i < closes.length; i++) {
    if (ema === null) {
      if (i < period - 1) { result.push(null); continue }
      ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
    } else {
      ema = closes[i] * k + ema * (1 - k)
    }
    result.push(ema)
  }
  return result
}

export function calcRSI(closes, period = 14) {
  const result = []
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) gains += diff; else losses -= diff
  }
  let avgGain = gains / period
  let avgLoss = losses / period
  for (let i = 0; i < closes.length; i++) {
    if (i < period) { result.push(null); continue }
    if (i > period) {
      const diff = closes[i] - closes[i - 1]
      avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period
      avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    result.push(100 - 100 / (1 + rs))
  }
  return result
}

export function calcMACD(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast = calcEMA(closes, fast)
  const emaSlow = calcEMA(closes, slow)
  const macdLine = emaFast.map((f, i) => f != null && emaSlow[i] != null ? f - emaSlow[i] : null)
  const validMacd = macdLine.filter(v => v != null)
  const signalEma = calcEMA(validMacd, signal)
  const signalLine = macdLine.map((v, i) => {
    if (v == null) return null
    const validIdx = macdLine.slice(0, i + 1).filter(x => x != null).length - 1
    return signalEma[validIdx] ?? null
  })
  const histogram = macdLine.map((v, i) =>
    v != null && signalLine[i] != null ? v - signalLine[i] : null
  )
  return { macdLine, signalLine, histogram }
}

export function calcBollingerBands(closes, period = 20, stdDev = 2) {
  const sma = calcSMA(closes, period)
  return closes.map((_, i) => {
    if (sma[i] == null) return { upper: null, middle: null, lower: null }
    const slice = closes.slice(i - period + 1, i + 1)
    const mean = sma[i]
    const variance = slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period
    const std = Math.sqrt(variance)
    return { upper: mean + stdDev * std, middle: mean, lower: mean - stdDev * std }
  })
}

export function calcATR(candles, period = 14) {
  const trs = candles.map((c, i) => {
    if (i === 0) return c.high - c.low
    const prev = candles[i - 1]
    return Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close))
  })
  return calcSMA(trs, period)
}

// ─── Support & Resistance ───────────────────────────────────────────────────

export function findSupportResistance(candles, lookback = 20) {
  const levels = []
  const closes = candles.map(c => c.close)
  const highs = candles.map(c => c.high)
  const lows = candles.map(c => c.low)

  // Find local highs (resistance) and lows (support)
  for (let i = lookback; i < candles.length - lookback; i++) {
    const localHigh = Math.max(...highs.slice(i - lookback, i + lookback))
    const localLow = Math.min(...lows.slice(i - lookback, i + lookback))
    if (highs[i] === localHigh) levels.push({ price: highs[i], type: 'resistance', strength: 1 })
    if (lows[i] === localLow) levels.push({ price: lows[i], type: 'support', strength: 1 })
  }

  // Cluster close levels together (within 0.3% of each other)
  const clustered = []
  const used = new Set()
  for (let i = 0; i < levels.length; i++) {
    if (used.has(i)) continue
    const group = [levels[i]]
    used.add(i)
    for (let j = i + 1; j < levels.length; j++) {
      if (used.has(j)) continue
      const pct = Math.abs(levels[j].price - levels[i].price) / levels[i].price
      if (pct < 0.003) { group.push(levels[j]); used.add(j) }
    }
    const avgPrice = group.reduce((s, l) => s + l.price, 0) / group.length
    const dominantType = group.filter(l => l.type === 'resistance').length >= group.filter(l => l.type === 'support').length
      ? 'resistance' : 'support'
    clustered.push({ price: avgPrice, type: dominantType, strength: group.length })
  }

  // Sort by strength, return top levels closest to current price
  const current = closes[closes.length - 1]
  return clustered
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 12)
    .sort((a, b) => a.price - b.price)
    .map(l => ({
      ...l,
      distance: ((l.price - current) / current) * 100,
    }))
}

// ─── Pivot Points (Classic) ─────────────────────────────────────────────────

export function calcPivotPoints(candles) {
  // Use last 20 candles as "previous period"
  const recent = candles.slice(-20)
  const H = Math.max(...recent.map(c => c.high))
  const L = Math.min(...recent.map(c => c.low))
  const C = recent[recent.length - 1].close

  const PP = (H + L + C) / 3
  return {
    PP,
    R1: 2 * PP - L,
    R2: PP + (H - L),
    R3: H + 2 * (PP - L),
    S1: 2 * PP - H,
    S2: PP - (H - L),
    S3: L - 2 * (H - PP),
  }
}

// ─── Fibonacci Retracement ──────────────────────────────────────────────────

export function calcFibonacci(candles, lookback = 60) {
  const slice = candles.slice(-lookback)
  const H = Math.max(...slice.map(c => c.high))
  const L = Math.min(...slice.map(c => c.low))
  const diff = H - L
  const LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
  return LEVELS.map(ratio => ({
    ratio,
    price: H - diff * ratio,
    label: `Fib ${(ratio * 100).toFixed(1)}%`,
  }))
}

// ─── Linear Regression & Projection ────────────────────────────────────────

export function calcLinearRegression(candles, period = 50) {
  const slice = candles.slice(-period)
  const n = slice.length
  const xs = slice.map((_, i) => i)
  const ys = slice.map(c => c.close)
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0)
  const sumXX = xs.reduce((s, x) => s + x * x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  // R² (goodness of fit)
  const meanY = sumY / n
  const ssTot = ys.reduce((s, y) => s + (y - meanY) ** 2, 0)
  const ssRes = ys.reduce((s, y, i) => s + (y - (intercept + slope * xs[i])) ** 2, 0)
  const rSquared = 1 - ssRes / ssTot

  // Project forward
  const project = (daysAhead) => intercept + slope * (n - 1 + daysAhead)

  // Channel width (2x standard error)
  const stdErr = Math.sqrt(ssRes / n)

  return { slope, intercept, rSquared, project, stdErr, trendDir: slope > 0 ? 'up' : 'down' }
}

export function buildPriceProjections(candles, holdingDays = 5) {
  const reg = calcLinearRegression(candles, Math.min(60, candles.length))
  const atr = calcATR(candles)[candles.length - 1]
  const current = candles[candles.length - 1].close

  const targets = [1, 3, 5, 10, 20].filter(d => d <= holdingDays * 2)
  return {
    regression: reg,
    targets: targets.map(d => ({
      days: d,
      base: reg.project(d),
      bull: reg.project(d) + atr * Math.sqrt(d),
      bear: reg.project(d) - atr * Math.sqrt(d),
      changePercent: ((reg.project(d) - current) / current) * 100,
    })),
    trendStrength: reg.rSquared,
    trendDir: reg.trendDir,
    dailyMoveExpected: atr,
    dailyMovePercent: (atr / current) * 100,
  }
}

// ─── Market Stats ───────────────────────────────────────────────────────────

export function calcMarketStats(candles) {
  if (!candles.length) return null
  const closes = candles.map(c => c.close)
  const current = closes[closes.length - 1]
  const high52w = Math.max(...candles.map(c => c.high))
  const low52w = Math.min(...candles.map(c => c.low))
  const volumes = candles.map(c => c.volume).filter(v => v > 0)
  const avgVolume = volumes.length ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0
  const lastVolume = candles[candles.length - 1].volume

  // 30-day volatility (annualized)
  const returns = closes.slice(-31).map((c, i, arr) => i === 0 ? 0 : Math.log(c / arr[i - 1]))
  const meanRet = returns.slice(1).reduce((a, b) => a + b, 0) / (returns.length - 1)
  const variance = returns.slice(1).reduce((s, r) => s + (r - meanRet) ** 2, 0) / (returns.length - 2)
  const volatility30d = Math.sqrt(variance * 252) * 100  // annualized %

  // Distance from 52w extremes
  const fromHigh = ((current - high52w) / high52w) * 100
  const fromLow = ((current - low52w) / low52w) * 100

  // Trend (SMA-based)
  const sma20 = calcSMA(closes, 20)
  const sma50 = calcSMA(closes, 50)
  const sma200 = calcSMA(closes, Math.min(200, closes.length))
  const lastSma20 = sma20[sma20.length - 1]
  const lastSma50 = sma50[sma50.length - 1]
  const lastSma200 = sma200[sma200.length - 1]

  let trend = 'seitwärts'
  if (current > lastSma20 && lastSma20 > lastSma50) trend = 'starker Aufwärtstrend'
  else if (current > lastSma50) trend = 'Aufwärtstrend'
  else if (current < lastSma20 && lastSma20 < lastSma50) trend = 'starker Abwärtstrend'
  else if (current < lastSma50) trend = 'Abwärtstrend'

  return {
    current, high52w, low52w, fromHigh, fromLow,
    avgVolume, lastVolume,
    volumeRatio: avgVolume ? lastVolume / avgVolume : null,
    volatility30d, trend,
    sma20: lastSma20, sma50: lastSma50, sma200: lastSma200,
  }
}

// ─── Signal Scoring ─────────────────────────────────────────────────────────

export function scoreSignals(candles) {
  if (candles.length < 50) return null
  const closes = candles.map(c => c.close)
  const rsi = calcRSI(closes)
  const { macdLine, signalLine, histogram } = calcMACD(closes)
  const bb = calcBollingerBands(closes)
  const sma20 = calcSMA(closes, 20)
  const sma50 = calcSMA(closes, 50)
  const atrArr = calcATR(candles)
  const last = closes.length - 1
  const rsiVal = rsi[last]
  const macdVal = macdLine[last]
  const sigVal = signalLine[last]
  const histVal = histogram[last]
  const bbVal = bb[last]
  const currentPrice = closes[last]
  const atr = atrArr[last]

  let bullScore = 0, bearScore = 0
  const signals = []

  if (rsiVal != null) {
    if (rsiVal < 30) { bullScore += 2; signals.push({ label: 'RSI überverkauft', type: 'bull' }) }
    else if (rsiVal < 45) { bullScore += 1; signals.push({ label: 'RSI bullish', type: 'bull' }) }
    else if (rsiVal > 70) { bearScore += 2; signals.push({ label: 'RSI überkauft', type: 'bear' }) }
    else if (rsiVal > 55) { bearScore += 1; signals.push({ label: 'RSI bearish', type: 'bear' }) }
  }
  if (macdVal != null && sigVal != null) {
    if (macdVal > sigVal && histVal > 0) { bullScore += 2; signals.push({ label: 'MACD bullish Kreuz', type: 'bull' }) }
    else if (macdVal < sigVal && histVal < 0) { bearScore += 2; signals.push({ label: 'MACD bearish Kreuz', type: 'bear' }) }
  }
  if (bbVal.lower != null) {
    if (currentPrice < bbVal.lower) { bullScore += 2; signals.push({ label: 'Unter unterem BB', type: 'bull' }) }
    else if (currentPrice > bbVal.upper) { bearScore += 2; signals.push({ label: 'Über oberem BB', type: 'bear' }) }
  }
  if (sma20[last] != null && sma50[last] != null) {
    if (sma20[last] > sma50[last] && currentPrice > sma20[last]) {
      bullScore += 1; signals.push({ label: 'Aufwärtstrend (SMA)', type: 'bull' })
    } else if (sma20[last] < sma50[last] && currentPrice < sma20[last]) {
      bearScore += 1; signals.push({ label: 'Abwärtstrend (SMA)', type: 'bear' })
    }
  }

  const total = bullScore + bearScore
  const winProbability = total === 0 ? 50 : Math.round((bullScore / total) * 100)
  const direction = bullScore > bearScore ? 'LONG' : bearScore > bullScore ? 'SHORT' : 'NEUTRAL'

  return {
    rsi: rsiVal, macd: macdVal, macdSignal: sigVal, macdHist: histVal,
    bb: bbVal, sma20: sma20[last], sma50: sma50[last], atr,
    currentPrice, bullScore, bearScore, winProbability, direction, signals,
    strength: total === 0 ? 0 : Math.round((Math.max(bullScore, bearScore) / total) * 100),
  }
}

export function calcStopLoss(score, riskPercent, maxLossPercent) {
  if (!score || !score.atr) return null
  const { currentPrice, direction, atr } = score
  const atrMultiplier = 1 + (5 - riskPercent) * 0.5
  const stopDistance = atr * atrMultiplier
  const maxStopDistance = currentPrice * (maxLossPercent / 100)
  const finalStopDistance = Math.min(stopDistance, maxStopDistance)
  const stopLoss = direction === 'LONG' ? currentPrice - finalStopDistance : currentPrice + finalStopDistance
  const takeProfit = direction === 'LONG' ? currentPrice + finalStopDistance * 2 : currentPrice - finalStopDistance * 2
  return {
    entryPrice: currentPrice, stopLoss, takeProfit,
    stopDistance: finalStopDistance,
    stopPercent: (finalStopDistance / currentPrice) * 100,
    riskReward: 2.0,
  }
}

// ─── Backtest ────────────────────────────────────────────────────────────────

export function runBacktest(candles, riskPercent = 3, maxLossPercent = 5) {
  if (candles.length < 60) return null
  const trades = []
  const windowSize = 50
  for (let i = windowSize; i < candles.length - 5; i++) {
    const slice = candles.slice(i - windowSize, i)
    const score = scoreSignals(slice)
    if (!score || score.direction === 'NEUTRAL' || score.strength < 60) continue
    const entry = candles[i].open
    const atr = score.atr
    const stopDist = Math.min(atr * 1.5, entry * (maxLossPercent / 100))
    const tp = score.direction === 'LONG' ? entry + stopDist * 2 : entry - stopDist * 2
    const sl = score.direction === 'LONG' ? entry - stopDist : entry + stopDist
    let exitPrice = null, exitReason = null
    for (let j = i + 1; j <= Math.min(i + 20, candles.length - 1); j++) {
      const c = candles[j]
      if (score.direction === 'LONG') {
        if (c.low <= sl) { exitPrice = sl; exitReason = 'SL'; break }
        if (c.high >= tp) { exitPrice = tp; exitReason = 'TP'; break }
      } else {
        if (c.high >= sl) { exitPrice = sl; exitReason = 'SL'; break }
        if (c.low <= tp) { exitPrice = tp; exitReason = 'TP'; break }
      }
    }
    if (!exitPrice) { exitPrice = candles[Math.min(i + 20, candles.length - 1)].close; exitReason = 'Timeout' }
    const pnl = score.direction === 'LONG' ? exitPrice - entry : entry - exitPrice
    trades.push({ entry, exitPrice, pnl, exitReason, direction: score.direction, date: candles[i].time })
  }
  if (trades.length === 0) return null
  const wins = trades.filter(t => t.pnl > 0)
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0)
  const winRate = Math.round((wins.length / trades.length) * 100)
  return { trades, wins: wins.length, losses: trades.length - wins.length, winRate, totalPnl, totalTrades: trades.length }
}
