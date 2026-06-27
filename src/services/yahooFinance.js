const PROXY = 'https://corsproxy.io/?url='
const YF_BASE = 'https://query1.finance.yahoo.com'

function buildUrl(path, params = {}) {
  const url = new URL(YF_BASE + path)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return PROXY + encodeURIComponent(url.toString())
}

export async function fetchQuote(symbol) {
  const url = buildUrl('/v8/finance/chart/' + symbol, {
    interval: '1d',
    range: '5d',
  })
  const res = await fetch(url)
  if (!res.ok) throw new Error('Quote fetch failed')
  const data = await res.json()
  const result = data.chart.result[0]
  const meta = result.meta
  return {
    symbol,
    price: meta.regularMarketPrice,
    previousClose: meta.previousClose || meta.chartPreviousClose,
    change: meta.regularMarketPrice - (meta.previousClose || meta.chartPreviousClose),
    changePercent:
      ((meta.regularMarketPrice - (meta.previousClose || meta.chartPreviousClose)) /
        (meta.previousClose || meta.chartPreviousClose)) *
      100,
    currency: meta.currency,
    marketState: meta.marketState,
  }
}

export async function fetchHistory(symbol, range = '1y', interval = '1d') {
  const url = buildUrl('/v8/finance/chart/' + symbol, { interval, range })
  const res = await fetch(url)
  if (!res.ok) throw new Error('History fetch failed')
  const data = await res.json()
  const result = data.chart.result[0]
  const timestamps = result.timestamp
  const ohlcv = result.indicators.quote[0]

  return timestamps.map((ts, i) => ({
    time: ts,
    open: ohlcv.open[i],
    high: ohlcv.high[i],
    low: ohlcv.low[i],
    close: ohlcv.close[i],
    volume: ohlcv.volume?.[i] ?? 0,
  })).filter(c => c.open != null && c.close != null)
}

export async function fetchMultipleQuotes(symbols) {
  const results = await Promise.allSettled(symbols.map(fetchQuote))
  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { symbol: symbols[i], error: true }
  )
}
