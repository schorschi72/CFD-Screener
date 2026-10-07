// Cloudflare Worker: holt Yahoo-Finance-Daten serverseitig (kein CORS-Proxy nötig).
//   GET /quotes?symbols=EURUSD=X,^GSPC   → [{ symbol, price, previousClose, ... }]
//   GET /history?symbol=^GSPC&range=1y&interval=1d → Kerzen-Array
const YF_HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']
const MAX_SYMBOLS = 40          // Free-Plan: max. 50 Subrequests pro Aufruf
const QUOTE_TTL = 30            // Sekunden
const HISTORY_TTL = 300

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const json = (body, status = 200, ttl = 0) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      'Content-Type': 'application/json',
      'Cache-Control': ttl ? `public, max-age=${ttl}` : 'no-store',
    },
  })

async function yahooChart(symbol, range, interval, ttl) {
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`
  let lastErr
  for (const host of YF_HOSTS) {
    try {
      const res = await fetch(host + path, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CFD-Screener)', Accept: 'application/json' },
        cf: { cacheTtl: ttl, cacheEverything: true },
      })
      if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`)
      const data = await res.json()
      const result = data?.chart?.result?.[0]
      if (!result) throw new Error(data?.chart?.error?.description || 'Keine Daten')
      return result
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

async function quote(symbol) {
  const { meta } = await yahooChart(symbol, '5d', '1d', QUOTE_TTL)
  const prev = meta.previousClose || meta.chartPreviousClose
  const price = meta.regularMarketPrice
  return {
    symbol,
    price,
    previousClose: prev,
    change: price - prev,
    changePercent: ((price - prev) / prev) * 100,
    currency: meta.currency,
    marketState: meta.marketState || marketState(meta),
  }
}

// Das Chart-Endpoint liefert kein marketState mehr -> aus den Handelszeiten ableiten.
function marketState(meta) {
  const now = Date.now() / 1000
  const p = meta.currentTradingPeriod || {}
  const within = t => t && now >= t.start && now < t.end
  if (within(p.regular)) return 'REGULAR'
  if (within(p.pre)) return 'PRE'
  if (within(p.post)) return 'POST'
  return 'CLOSED'
}

async function history(symbol, range, interval) {
  const r = await yahooChart(symbol, range, interval, HISTORY_TTL)
  const q = r.indicators.quote[0]
  return (r.timestamp || [])
    .map((time, i) => ({
      time,
      open: q.open[i],
      high: q.high[i],
      low: q.low[i],
      close: q.close[i],
      volume: q.volume?.[i] ?? 0,
    }))
    .filter(c => c.open != null && c.close != null)
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })
    const url = new URL(request.url)

    try {
      if (url.pathname === '/quotes') {
        const symbols = (url.searchParams.get('symbols') || '').split(',').filter(Boolean)
        if (!symbols.length || symbols.length > MAX_SYMBOLS) {
          return json({ error: `1–${MAX_SYMBOLS} Symbole erwartet` }, 400)
        }
        const results = await Promise.allSettled(symbols.map(quote))
        return json(
          results.map((r, i) => (r.status === 'fulfilled' ? r.value : { symbol: symbols[i], error: true })),
          200,
          QUOTE_TTL,
        )
      }

      if (url.pathname === '/history') {
        const symbol = url.searchParams.get('symbol')
        if (!symbol) return json({ error: 'symbol fehlt' }, 400)
        const range = url.searchParams.get('range') || '1y'
        const interval = url.searchParams.get('interval') || '1d'
        return json(await history(symbol, range, interval), 200, HISTORY_TTL)
      }

      return json({ ok: true, endpoints: ['/quotes', '/history'] })
    } catch (e) {
      return json({ error: e.message }, 502)
    }
  },
}
