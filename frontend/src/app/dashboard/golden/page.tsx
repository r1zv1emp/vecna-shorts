'use client'
import { useEffect, useState } from 'react'
import { api, useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { Star, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface GoldenCoin {
  id: string; symbol: string; fundingRate: number; savedAt: string
}

export default function GoldenCoinsPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [coins, setCoins] = useState<GoldenCoin[]>([])

  useEffect(() => {
    if (user?.role !== 'OWNER') { router.push('/dashboard'); return }
    loadCoins()
  }, [user, router])

  const loadCoins = async () => {
    try {
      const res = await api.get('/api/screener/golden')
      setCoins(res.data)
    } catch { /* ignore */ }
  }

  const remove = async (id: string) => {
    try {
      await api.delete(`/api/admin/golden-coins/${id}`)
      setCoins(c => c.filter(x => x.id !== id))
      toast.success('Removed')
    } catch { toast.error('Failed to remove') }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Star className="text-yellow-400" size={24} /> Golden Coins
        </h1>
        <p className="text-vecna-muted text-sm mt-1">Coins that reached funding rate ≤ -2% — permanently saved</p>
      </div>

      {coins.length === 0 ? (
        <div className="vecna-card p-12 text-center">
          <Star size={40} className="text-vecna-muted mx-auto mb-4" />
          <p className="text-vecna-muted">No golden coins yet. Coins with funding rate ≤ -2% will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {coins.map(coin => (
            <div key={coin.id} className="vecna-card p-4 border border-yellow-500/20 bg-yellow-500/5 relative group">
              <button onClick={() => remove(coin.id)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-vecna-muted hover:text-vecna-red p-1">
                <Trash2 size={14} />
              </button>
              <div className="flex items-center gap-2 mb-3">
                <Star size={14} className="text-yellow-400" />
                <span className="font-mono font-bold text-white">{coin.symbol.replace('USDT', '')}</span>
                <span className="text-vecna-muted text-xs">USDT</span>
              </div>
              <div className="text-xl font-bold font-mono text-yellow-400 mb-2">{coin.fundingRate.toFixed(4)}%</div>
              <div className="text-vecna-muted text-xs">Saved {format(new Date(coin.savedAt), 'MMM dd, yyyy')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
