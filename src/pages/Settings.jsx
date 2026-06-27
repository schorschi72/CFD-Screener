export default function Settings({ settings, onUpdate }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-2">Einstellungen</h1>
      <p className="text-slate-400 text-sm mb-6">Passe Risikoprofil und API-Schlüssel an. Alle Werte werden lokal gespeichert.</p>

      <div className="space-y-4">
        {/* API Key */}
        <div className="card">
          <h2 className="font-semibold text-white mb-4">KI-Analyse (Google Gemini)</h2>
          <label className="label">Gemini API Key (AI Studio)</label>
          <input
            type="password"
            value={settings.geminiApiKey}
            onChange={e => onUpdate({ geminiApiKey: e.target.value })}
            placeholder="AIza..."
            className="input font-mono text-sm"
          />
          <p className="text-slate-500 text-xs mt-2">
            Kostenlos unter <span className="text-blue-400">aistudio.google.com</span> erhältlich.
            Der Key wird nur lokal in deinem Browser gespeichert.
          </p>
        </div>

        {/* Risk */}
        <div className="card">
          <h2 className="font-semibold text-white mb-4">Risikoprofil</h2>

          <div className="mb-4">
            <label className="label">Risikobereitschaft: <span className="text-blue-400">{['','Sehr konservativ','Konservativ','Moderat','Aggressiv','Sehr aggressiv'][settings.riskLevel]}</span></label>
            <input
              type="range" min={1} max={5} step={1}
              value={settings.riskLevel}
              onChange={e => onUpdate({ riskLevel: Number(e.target.value) })}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Sehr konservativ</span>
              <span>Sehr aggressiv</span>
            </div>
            <p className="text-slate-400 text-xs mt-2">
              Beeinflusst den Stop-Loss-Abstand: Konservativ = weiterer Stop (mehr Spielraum), Aggressiv = engerer Stop.
            </p>
          </div>

          <div className="mb-4">
            <label className="label">Maximaler Verlust pro Trade: <span className="text-red-400">{settings.maxLossPercent}%</span></label>
            <input
              type="range" min={0.5} max={10} step={0.5}
              value={settings.maxLossPercent}
              onChange={e => onUpdate({ maxLossPercent: Number(e.target.value) })}
              className="w-full accent-red-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0.5% (sehr eng)</span>
              <span>10% (weit)</span>
            </div>
            <p className="text-slate-400 text-xs mt-2">
              Maximaler Stop-Loss als Prozentsatz des Einstiegspreises. Bei hohem ATR wird der Stop automatisch auf diesen Wert begrenzt.
            </p>
          </div>

          <div>
            <label className="label">Geplante Haltedauer: <span className="text-blue-400">{settings.holdingDays} Tage</span></label>
            <input
              type="range" min={1} max={30} step={1}
              value={settings.holdingDays}
              onChange={e => onUpdate({ holdingDays: Number(e.target.value) })}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>1 Tag (Intraday)</span>
              <span>30 Tage (Swing)</span>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="card">
          <h2 className="font-semibold text-white mb-4">Screener Filter</h2>
          <div>
            <label className="label">Mindest-Gewinnwahrscheinlichkeit: <span className="text-blue-400">{settings.minWinProbability}%</span></label>
            <input
              type="range" min={50} max={80} step={5}
              value={settings.minWinProbability}
              onChange={e => onUpdate({ minWinProbability: Number(e.target.value) })}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>50% (alle zeigen)</span>
              <span>80% (nur beste)</span>
            </div>
            <p className="text-slate-400 text-xs mt-2">
              Instrumente unterhalb dieser Schwelle werden im Screener ausgeblendet.
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="card bg-yellow-950/20 border-yellow-800/40">
          <h2 className="font-semibold text-yellow-400 mb-2">⚠️ Risikohinweis</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Dieser Screener dient ausschliesslich zu Informationszwecken. CFD-Handel ist hochriskant und nicht für jeden Anleger geeignet.
            Technische Signale und Backtests sind keine Garantie für zukünftige Gewinne.
            Die KI-Analyse ersetzt keine professionelle Finanzberatung.
            Handle nie mit Geld, das du dir nicht leisten kannst zu verlieren.
          </p>
        </div>
      </div>
    </div>
  )
}
