const PROXY = 'https://corsproxy.io/?url='
const YF_BASE = 'https://query1.finance.yahoo.com'

function buildUrl(path, params = {}) {
  const url = new URL(YF_BASE + path)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return PROXY + encodeURIComponent(url.toString())
}

async function fetchJson(url, label) {
  let res
  try {
    res = await fetch(url)
  } catch (networkErr) {
    // Typically a CORS error, ad-blocker, or the proxy/host being unreachable.
    throw new Error(
      `${label} network error: ${networkErr.message} (check browser console, ad-blocker, or proxy/upstream availability)`
    )
  }

  if (!res.ok) {
    let bodySnippet = ''
    try {
      bodySnippet = (await res.text()).slice(0, 200)
    } catch {
      // ignore body read failures
    }
    throw new Error(
      `${label} failed: HTTP ${res.status} ${res.statusText}${bodySnippet ? ` — ${bodySnippet}` : ''}`
    )
  }

  try {
    return await res.json()
  } catch (parseErr) {
    throw new Error(`${label} returned invalid JSON: ${parseErr.message}`)
  }
}

export async function fetchQuote(symbol) {
  const url = buildUrl('/v8/finance/chart/' + symbol, {
    interval: '1d',
    range: '5d',
  })
  const data = await fetchJson(url, `Quote fetch for ${symbol}`)
  const result = data?.chart?.result?.[0]
  const meta = result?.meta
  if (!meta) {
    throw new Error(
      `Quote fetch for ${symbol} returned an unexpected response shape (chart.result[0].meta missing)`
    )
  }
  const previousClose = meta.previousClose ?? meta.chartPreviousClose
  return {
    symbol,
    price: meta.regularMarketPrice,
    previousClose,
    change: meta.regularMarketPrice - previousClose,
    changePercent: ((meta.regularMarketPrice - previousClose) / previousClose) * 100,
    currency: meta.currency,
    marketState: meta.marketState,
  }
}

export async function fetchHistory(symbol, range = '1y', interval = '1d') {
  const url = buildUrl('/v8/finance/chart/' + symbol, { interval, range })
  const data = await fetchJson(url, `History fetch for ${symbol}`)
  const result = data?.chart?.result?.[0]
  const timestamps = result?.timestamp
  const ohlcv = result?.indicators?.quote?.[0]
  if (!timestamps || !ohlcv) {
    throw new Error(
      `History fetch for ${symbol} returned an unexpected response shape (timestamp/indicators missing)`
    )
  }

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
    if (import.meta.env?.DEV) {
      console.warn(`[yahooFinance] fetchQuote(${symbols[i]}) failed:`, r.reason)
    }
    return { symbol: symbols[i], error: true, errorMessage: r.reason?.message ?? String(r.reason) }
  })
}
