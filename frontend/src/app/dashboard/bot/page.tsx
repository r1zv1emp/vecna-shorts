'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/store'
import toast from 'react-hot-toast'
import { Play, Square, Zap, Settings2 } from 'lucide-react'
import { onWsEvent } from '@/hooks/useWebSocket'

interface BotSettings {
  isRunning: boolean
  marginPercent: number
  takeProfitPct: number
  stopLossPct: number
  closeAfterMin: number
}

const CLOSE_PRESETS = [5, 10, 15]

export default function BotPage() {
  const [settings, setSettings] = useState<BotSettings>({
    isRunning: false, marginPercent: 5, takeProfitPct: 1.5, stopLossPct: 2, closeAfterMin: 10
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
    const unsub1 = onWsEvent('BOT_STARTED', () => setSettings(p => ({ ...p, isRunning: true })))
    const unsub2 = onWsEvent('BOT_STOPPED', () => setSettings(p => ({ ...p, isRunning: false })))
    return () => { unsub1(); unsub2() }
  }, [])

  const loadSettings = async () => {
    try {
      const [settingsRes, statusRes] = await Promise.all([api.get('/api/bot/settings'), api.get('/api/bot/status')])
      setSettings({ ...settingsRes.data, isRunning: statusRes.data.isRunning })
    } catch { /* ignore */ }
  }

  const toggleBot = async () => {
    setLoading(true)
    try {
      if (settings.isRunning) {
        await api.post('/api/bot/stop')
        toast.success('Bot stopped')
        setSettings(p => ({ ...p, isRunning: false }))
      } else {
        await api.post('/api/bot/start')
        toast.success('Bot started! 🚀')
        setSettings(p => ({ ...p, isRunning: true }))
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      toast.error(error.response?.data?.error || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      await api.put('/api/bot/settings', {
        marginPercent: settings.marginPercent,
        takeProfitPct: settings.takeProfitPct,
        stopLossPct: settings.stopLossPct,
        closeAfterMin: settings.closeAfterMin,
      })
      toast.success('Settings saved')
    } catch { toast.error('Failed to save') } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Bot Control</h1>
        <p className="text-vecna-muted text-sm mt-1">Configure and control your funding rate bot</p>
      </div>

      {/* Bot status card */}
      <div className={`vecna-card p-6 border ${settings.isRunning ? 'border-vecna-green/30 bg-vecna-green/5' : 'border-vecna-border'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${settings.isRunning ? 'bg-vecna-green/20' : 'bg-vecna-muted/10'}`}>
              <Zap size={22} className={settings.isRunning ? 'text-vecna-green' : 'text-vecna-muted'} />
            </div>
            <div>
              <div className="text-white font-semibold">Trading Bot</div>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${settings.isRunning ? 'bg-vecna-green animate-pulse' : 'bg-vecna-muted'}`} />
                <span className={`text-sm ${settings.isRunning ? 'text-vecna-green' : 'text-vecna-muted'}`}>
                  {settings.isRunning ? 'Running — Monitoring funding rates' : 'Stopped'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={toggleBot} disabled={loading}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 ${settings.isRunning ? 'bg-vecna-red/20 text-vecna-red hover:bg-vecna-red/30 border border-vecna-red/30' : 'btn-primary'}`}>
            {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : settings.isRunning ? <Square size={16} /> : <Play size={16} />}
            {settings.isRunning ? 'Stop Bot' : 'Start Bot'}
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="vecna-card">
        <div className="p-4 border-b border-vecna-border flex items-center gap-2">
          <Settings2 size={16} className="text-vecna-accent" />
          <h2 className="text-white font-semibold">Trading Parameters</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <NumberInput label="Margin %" hint="% of balance per trade" value={settings.marginPercent} min={1} max={100} step={0.5}
              onChange={v => setSettings(p => ({ ...p, marginPercent: v }))} />
            <NumberInput label="Take Profit %" hint="Close trade at profit %" value={settings.takeProfitPct} min={0.1} max={100} step={0.1}
              onChange={v => setSettings(p => ({ ...p, takeProfitPct: v }))} />
            <NumberInput label="Stop Loss %" hint="Max loss before close" value={settings.stopLossPct} min={0.1} max={100} step={0.1}
              onChange={v => setSettings(p => ({ ...p, stopLossPct: v }))} />
          </div>

          {/* Time-based close */}
          <div>
            <label className="block text-sm text-vecna-muted mb-3">Time-based Close (if TP not hit)</label>
            <div className="flex gap-2 flex-wrap">
              {CLOSE_PRESETS.map(min => (
                <button key={min} onClick={() => setSettings(p => ({ ...p, closeAfterMin: min }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${settings.closeAfterMin === min ? 'bg-vecna-accent/20 text-vecna-accent border border-vecna-accent/30' : 'bg-vecna-card text-vecna-muted border border-vecna-border hover:border-vecna-accent/30'}`}>
                  {min}m
                </button>
              ))}
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={1440} value={settings.closeAfterMin}
                  onChange={e => setSettings(p => ({ ...p, closeAfterMin: parseInt(e.target.value) || 10 }))}
                  className="vecna-input w-24 text-center text-sm" />
                <span className="text-vecna-muted text-sm">min (custom)</span>
              </div>
            </div>
          </div>

          <button onClick={saveSettings} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}

function NumberInput({ label, hint, value, min, max, step, onChange }: {
  label: string; hint: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="block text-sm text-vecna-muted mb-1">{label}</label>
      <input type="number" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="vecna-input font-mono" />
      <p className="text-xs text-vecna-muted/60 mt-1">{hint}</p>
    </div>
  )
}
