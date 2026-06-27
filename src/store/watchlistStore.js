import { useState, useEffect } from 'react'

const KEY = 'plus500_watchlist'

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(watchlist))
  }, [watchlist])

  const isWatched = (symbol) => watchlist.includes(symbol)

  const toggle = (symbol) => {
    setWatchlist(prev =>
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    )
  }

  return { watchlist, isWatched, toggle }
}
