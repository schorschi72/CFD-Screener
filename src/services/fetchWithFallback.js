// Shared CORS proxy list used by both quote/history and calendar fetches.
// If the primary proxy is down or rate-limited, we retry once through an
// alternate proxy before giving up, so a single proxy outage doesn't take
// down the whole app.
export const CORS_PROXIES = [
  (target) => 'https://corsproxy.io/?url=' + encodeURIComponent(target),
  (target) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(target),
]

// Fetches `target` through each configured proxy in turn, returning the
// first successful response. Logs each failure (with the full underlying
// cause, including proxy URLs) to the console for debugging, while the
// error thrown to callers only contains a safe, generic summary suitable
// for display in the UI.
export async function fetchViaProxies(target, context, proxies = CORS_PROXIES) {
  const reasons = []
  for (const buildProxyUrl of proxies) {
    const proxyUrl = buildProxyUrl(target)
    try {
      const res = await fetch(proxyUrl)
      if (!res.ok) {
        const reason = `HTTP ${res.status}`
        reasons.push(reason)
        console.error(`[${context}] ${proxyUrl} returned ${reason} ${res.statusText || ''}`.trim())
        continue
      }
      return res
    } catch (err) {
      reasons.push('network error')
      console.error(`[${context}] fetch via ${proxyUrl} threw an error:`, err)
    }
  }
  throw new Error(
    `${context} failed: all data proxies are unreachable or blocked (${reasons.join(', ') || 'unknown error'}).`
  )
}
