import { useEffect, useRef } from 'react'
import { createChart } from 'lightweight-charts'

export default function PriceChart({ candles, tradeSetup, supportResistance, pivots, fibonacci, showFib, showPivots, showSR }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !candles?.length) return

    const chart = createChart(containerRef.current, {
      layout: { background: { color: '#0f172a' }, textColor: '#94a3b8' },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#334155' },
      timeScale: { borderColor: '#334155', timeVisible: true },
      width: containerRef.current.clientWidth,
      height: 340,
    })
    chartRef.current = chart

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981', downColor: '#ef4444',
      borderUpColor: '#10b981', borderDownColor: '#ef4444',
      wickUpColor: '#10b981', wickDownColor: '#ef4444',
    })

    const data = candles.map(c => ({
      time: c.time,
      open: c.open, high: c.high, low: c.low, close: c.close,
    })).sort((a, b) => a.time - b.time)

    candleSeries.setData(data)

    // ── Trade Setup lines ──
    if (tradeSetup) {
      const { entryPrice, stopLoss, takeProfit } = tradeSetup
      candleSeries.createPriceLine({ price: entryPrice, color: '#60a5fa', lineWidth: 2, lineStyle: 2, title: 'Entry' })
      candleSeries.createPriceLine({ price: stopLoss, color: '#ef4444', lineWidth: 1, lineStyle: 1, title: `SL ${stopLoss?.toFixed(4)}` })
      candleSeries.createPriceLine({ price: takeProfit, color: '#10b981', lineWidth: 1, lineStyle: 1, title: `TP ${takeProfit?.toFixed(4)}` })
    }

    // ── Support & Resistance ──
    if (showSR && supportResistance?.length) {
      supportResistance.forEach(lvl => {
        candleSeries.createPriceLine({
          price: lvl.price,
          color: lvl.type === 'resistance' ? '#f97316' : '#22d3ee',
          lineWidth: Math.min(lvl.strength, 2),
          lineStyle: 3,
          title: lvl.type === 'resistance' ? `R ${lvl.price.toFixed(4)}` : `S ${lvl.price.toFixed(4)}`,
        })
      })
    }

    // ── Pivot Points ──
    if (showPivots && pivots) {
      const pivotLines = [
        { key: 'PP', color: '#a78bfa', title: 'PP' },
        { key: 'R1', color: '#f97316', title: 'R1' },
        { key: 'R2', color: '#fb923c', title: 'R2' },
        { key: 'R3', color: '#fdba74', title: 'R3' },
        { key: 'S1', color: '#22d3ee', title: 'S1' },
        { key: 'S2', color: '#67e8f9', title: 'S2' },
        { key: 'S3', color: '#a5f3fc', title: 'S3' },
      ]
      pivotLines.forEach(({ key, color, title }) => {
        if (pivots[key]) {
          candleSeries.createPriceLine({ price: pivots[key], color, lineWidth: 1, lineStyle: 2, title: `${title} ${pivots[key].toFixed(4)}` })
        }
      })
    }

    // ── Fibonacci ──
    if (showFib && fibonacci?.length) {
      const fibColors = { 0: '#94a3b8', 0.236: '#fb7185', 0.382: '#f97316', 0.5: '#facc15', 0.618: '#4ade80', 0.786: '#22d3ee', 1: '#94a3b8' }
      fibonacci.forEach(fib => {
        candleSeries.createPriceLine({
          price: fib.price,
          color: fibColors[fib.ratio] ?? '#94a3b8',
          lineWidth: 1,
          lineStyle: 3,
          title: fib.label,
        })
      })
    }

    chart.timeScale().fitContent()

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth })
    })
    ro.observe(containerRef.current)

    return () => { ro.disconnect(); chart.remove() }
  }, [candles, tradeSetup, supportResistance, pivots, fibonacci, showFib, showPivots, showSR])

  return <div ref={containerRef} className="w-full rounded-lg overflow-hidden" style={{ height: 340 }} />
}
