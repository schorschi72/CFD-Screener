import { fetchViaProxies } from './fetchWithFallback.js'

const YF_BASE = 'https://query1.finance.yahoo.com'

function buildTargetUrl(path, params = {}) {
  const url = new URL(YF_BASE + path)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return url.toString()
}

export async function fetchQuote(symbol) {
  const target = buildTargetUrl('/v8/finance/chart/' + symbol, {
    interval: '1d',
    range: '5d',
  })
  const res = await fetchViaProxies(target, `Quote fetch for ${symbol}`)
  const data = await res.json()
  const result = data?.chart?.result?.[0]
  if (!result) {
    throw new Error(`Quote fetch for ${symbol} failed: unexpected response format from Yahoo Finance.`)
  }
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
  const target = buildTargetUrl('/v8/finance/chart/' + symbol, { interval, range })
  const res = await fetchViaProxies(target, `History fetch for ${symbol}`)
  const data = await res.json()
  const result = data?.chart?.result?.[0]
  if (!result) {
    throw new Error(`History fetch for ${symbol} failed: unexpected response format from Yahoo Finance.`)
  }
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
  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    console.error(`[yahooFinance] fetchMultipleQuotes: ${symbols[i]} failed:`, r.reason)
    return { symbol: symbols[i], error: true, errorMessage: r.reason?.message || 'Unknown error' }
  })
}
