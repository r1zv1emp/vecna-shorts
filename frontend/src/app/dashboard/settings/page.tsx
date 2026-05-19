'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/store'
import toast from 'react-hot-toast'
import { Key, Eye, EyeOff, Shield } from 'lucide-react'

interface ApiInfo {
  id: string; apiKey: string; secretKey: string; isTestnet: boolean; updatedAt: string
}

export default function SettingsPage() {
  const [apiInfo, setApiInfo] = useState<ApiInfo | null>(null)
  const [form, setForm] = useState({ apiKey: '', secretKey: '', isTestnet: false })
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/api/settings/api').then(r => {
      setApiInfo(r.data)
    }).catch(() => {})
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.apiKey || !form.secretKey) return toast.error('Fill API key and secret')
    setSaving(true)
    try {
      await api.post('/api/settings/api', form)
      toast.success('API keys saved securely')
      const r = await api.get('/api/settings/api')
      setApiInfo(r.data)
      setForm({ apiKey: '', secretKey: '', isTestnet: form.isTestnet })
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      toast.error(error.response?.data?.error || 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-vecna-muted text-sm mt-1">Configure your Binance API connection</p>
      </div>

      {/* Current API status */}
      {apiInfo && (
        <div className="vecna-card p-4 border border-vecna-green/20 bg-vecna-green/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-vecna-green rounded-full" />
            <span className="text-vecna-green text-sm font-medium">API Connected</span>
            {apiInfo.isTestnet && <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">TESTNET</span>}
          </div>
          <div className="font-mono text-vecna-muted text-xs">{apiInfo.apiKey}</div>
        </div>
      )}

      {/* API Settings form */}
      <div className="vecna-card">
        <div className="p-4 border-b border-vecna-border flex items-center gap-2">
          <Key size={16} className="text-vecna-accent" />
          <h2 className="text-white font-semibold">Binance API Settings</h2>
        </div>
        <form onSubmit={save} className="p-6 space-y-5">
          <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <Shield size={16} className="text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-vecna-muted">Keys are encrypted with AES-256 before storage. Never stored in plain text.</p>
          </div>

          <div>
            <label className="block text-sm text-vecna-muted mb-2">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                className="vecna-input font-mono pr-10"
                placeholder="Binance Futures API Key"
                value={form.apiKey}
                onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))}
              />
              <button type="button" onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-vecna-muted hover:text-white">
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-vecna-muted mb-2">Secret Key</label>
            <input
              type="password"
              className="vecna-input font-mono"
              placeholder="Binance Futures Secret Key"
              value={form.secretKey}
              onChange={e => setForm(p => ({ ...p, secretKey: e.target.value }))}
            />
          </div>

          {/* Testnet toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-vecna-card border border-vecna-border">
            <div>
              <div className="text-white text-sm font-medium">Testnet Mode</div>
              <div className="text-vecna-muted text-xs mt-0.5">Use Binance Futures Testnet for safe testing</div>
            </div>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, isTestnet: !p.isTestnet }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.isTestnet ? 'bg-vecna-accent' : 'bg-vecna-border'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isTestnet ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Saving...' : 'Save API Keys'}
          </button>
        </form>
      </div>
    </div>
  )
}
