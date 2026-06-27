import { useState, useEffect } from 'react'

const KEY = 'plus500_alerts'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? [] } catch { return [] }
}

export function useAlerts() {
  const [alerts, setAlerts] = useState(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(alerts))
  }, [alerts])

  function addAlert(alert) {
    setAlerts(prev => [{ ...alert, id: Date.now(), triggered: false }, ...prev])
  }

  function deleteAlert(id) {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  function checkAlerts(quotes) {
    let triggered = []
    setAlerts(prev => prev.map(a => {
      if (a.triggered) return a
      const price = quotes[a.symbol]?.price
      if (price == null) return a
      const hit = a.direction === 'above' ? price >= a.targetPrice : price <= a.targetPrice
      if (hit) {
        triggered.push({ ...a, price })
        return { ...a, triggered: true, triggeredAt: new Date().toISOString() }
      }
      return a
    }))
    return triggered
  }

  return { alerts, addAlert, deleteAlert, checkAlerts }
}
