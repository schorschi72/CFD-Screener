import { useState, useEffect } from 'react'

const KEY = 'plus500_journal'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? [] } catch { return [] }
}

export function useJournal() {
  const [trades, setTrades] = useState(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(trades))
  }, [trades])

  function addTrade(trade) {
    setTrades(prev => [{ ...trade, id: Date.now(), date: new Date().toISOString() }, ...prev])
  }

  function closeTrade(id, exitPrice) {
    setTrades(prev => prev.map(t => {
      if (t.id !== id || t.status === 'closed') return t
      const pnl = t.direction === 'LONG'
        ? (exitPrice - t.entry) * t.size
        : (t.entry - exitPrice) * t.size
      return { ...t, exitPrice, pnl: +pnl.toFixed(4), status: 'closed', closedAt: new Date().toISOString() }
    }))
  }

  function deleteTrade(id) {
    setTrades(prev => prev.filter(t => t.id !== id))
  }

  const open = trades.filter(t => t.status === 'open')
  const closed = trades.filter(t => t.status === 'closed')
  const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const wins = closed.filter(t => (t.pnl ?? 0) > 0).length
  const winRate = closed.length ? Math.round((wins / closed.length) * 100) : 0

  return { trades, open, closed, totalPnl, wins, winRate, addTrade, closeTrade, deleteTrade }
}
