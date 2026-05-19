'use client'
import { useEffect, useState, useCallback } from 'react'
import { api, useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { onWsEvent } from '@/hooks/useWebSocket'
import { Search, RefreshCw, Clock } from 'lucide-react'

interface FundingRate {
  symbol: string; fundingRate: number; nextFundingTime: number; markPrice: number
}

export default function ScreenerPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [rates, setRates] = useState<FundingRate[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    if (user?.role !== 'OWNER') { router.push('/dashboard'); return }
    loadRates()
    const unsub = onWsEvent('FUNDING_UPDATE', (data) => {
      setRates(data as FundingRate[])
      setLastUpdate(new Date())
    })
    return () => unsub()
  }, [user, router])

  const loadRates = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/screener/funding')
      setRates(res.data)
      setLastUpdate(new Date())
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const filtered = rates.filter(r => r.symbol.toLowerCase().includes(search.toLowerCase()))

  const formatCountdown = (nextTime: number) => {
    const diff = nextTime - Date.now()
    if (diff <= 0) return 'NOW'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`
  }

  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const t = setInterval(() => forceUpdate(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Funding Rate Screener</h1>
          <p className="text-vecna-muted text-sm mt-1">
            {lastUpdate ? `Last updated: ${lastUpdate.toLocaleTimeString()}` : 'Loading...'}
          </p>
        </div>
        <button onClick={loadRates} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-vecna-card border border-vecna-border text-vecna-muted hover:text-white transition-all disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded bg-vecna-accent/30 border border-vecna-accent/50" />
          <span className="text-vecna-muted">Selected (≤ -0.4%)</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded bg-yellow-500/30 border border-yellow-500/50" />
          <span className="text-vecna-muted">Golden (≤ -2%)</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-vecna-muted" />
        <input className="vecna-input pl-9 text-sm" placeholder="Search symbol..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="vecna-card overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full data-table text-sm">
            <thead className="sticky top-0 bg-vecna-card z-10">
              <tr className="text-vecna-muted border-b border-vecna-border text-xs uppercase">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Symbol</th>
                <th className="px-4 py-3 text-right">Funding Rate</th>
                <th className="px-4 py-3 text-right">Mark Price</th>
                <th className="px-4 py-3 text-right"><Clock size={12} className="inline mr-1" />Next Funding</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const isGolden = r.fundingRate <= -2
                const isSelected = r.fundingRate <= -0.4
                return (
                  <tr key={r.symbol} className={isGolden ? 'bg-yellow-500/5' : isSelected ? 'bg-vecna-accent/5' : ''}>
                    <td className="px-4 py-2.5 text-vecna-muted text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white">{r.symbol.replace('USDT', '')}</span>
                        <span className="text-vecna-muted text-xs">USDT</span>
                        {isGolden && <span className="text-yellow-400 text-xs">★</span>}
                        {isSelected && !isGolden && <span className="w-1.5 h-1.5 bg-vecna-accent rounded-full" />}
                      </div>
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono font-bold ${isGolden ? 'text-yellow-400' : r.fundingRate < 0 ? 'text-vecna-red' : 'text-vecna-green'}`}>
                      {r.fundingRate.toFixed(4)}%
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-vecna-muted">${r.markPrice.toFixed(4)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-vecna-muted text-xs">{formatCountdown(r.nextFundingTime)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
