// Datenquelle: Yahoo Finance über den eigenen Cloudflare Worker (siehe /worker).
// Die URL kommt aus VITE_PROXY_URL (z.B. https://cfd-data-proxy.<name>.workers.dev).
const PROXY_URL = (import.meta.env.VITE_PROXY_URL || '').replace(/\/$/, '')

export const hasProxy = Boolean(PROXY_URL)

async function get(path, params) {
  if (!PROXY_URL) {
    throw new Error('Kein Daten-Proxy konfiguriert (VITE_PROXY_URL fehlt)')
  }
  const url = new URL(PROXY_URL + path)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Daten-Proxy antwortete mit ${res.status}`)
  return res.json()
}

export async function fetchQuote(symbol) {
  const [q] = await get('/quotes', { symbols: symbol })
  if (!q || q.error) throw new Error('Quote fetch failed')
  return q
}

export function fetchHistory(symbol, range = '1y', interval = '1d') {
  return get('/history', { symbol, range, interval })
}

export async function fetchMultipleQuotes(symbols) {
  try {
    return await get('/quotes', { symbols: symbols.join(',') })
  } catch {
    return symbols.map(symbol => ({ symbol, error: true }))
  }
}
