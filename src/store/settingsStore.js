import { useState, useEffect } from 'react'

const KEY = 'plus500_settings'

const DEFAULTS = {
  claudeApiKey: '',
  riskLevel: 3,        // 1 (konservativ) – 5 (aggressiv)
  maxLossPercent: 3,   // % des Einstiegspreises
  holdingDays: 5,      // Haltedauer in Tagen
  minWinProbability: 60,
  selectedCategories: ['Alle'],
}

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(KEY)
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS
    } catch {
      return DEFAULTS
    }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(settings))
  }, [settings])

  function update(patch) {
    setSettings(prev => ({ ...prev, ...patch }))
  }

  return { settings, update }
}
