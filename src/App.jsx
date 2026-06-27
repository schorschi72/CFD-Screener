import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Screener from './pages/Screener'
import InstrumentDetail from './pages/InstrumentDetail'
import Backtest from './pages/Backtest'
import Settings from './pages/Settings'
import Journal from './pages/Journal'
import Calendar from './pages/Calendar'
import { useSettings } from './store/settingsStore'

export default function App() {
  const { settings, update } = useSettings()

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <Routes>
        <Route path="/" element={<Screener settings={settings} />} />
        <Route path="/instrument/:symbol" element={<InstrumentDetail settings={settings} />} />
        <Route path="/backtest" element={<Backtest settings={settings} />} />
        <Route path="/settings" element={<Settings settings={settings} onUpdate={update} />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/calendar" element={<Calendar />} />
      </Routes>
    </div>
  )
}
