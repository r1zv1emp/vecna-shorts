'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/store'
import { TrendingUp, TrendingDown, Activity, DollarSign, Zap, Target } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { onWsEvent } from '@/hooks/useWebSocket'

interface Stats {
  open: number
  closed: number
  totalPnl: number
  winRate: string
}

interface Trade {
  id: string
  symbol: string
  side: string
  entryPrice: number
  quantity: number
  leverage: number
  status: string
  fundingRate: number
  openedAt: string
  pnl?: number
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<Stats>({ open: 0, closed: 0, totalPnl: 0, winRate: '0' })
  const [recentTrades, setRecentTrades] = useState<Trade[]>([])
  const [botStatus, setBotStatus] = useState({ isRunning: false })

  useEffect(() => {
    loadData()
    const unsub = onWsEvent('TRADE_OPENED', loadData)
    const unsub2 = onWsEvent('TRADE_CLOSED', loadData)
    return () => { unsub(); unsub2() }
  }, [])

  const loadData = async () => {
    try {
      const [statsRes, tradesRes, botRes] = await Promise.all([
        api.get('/api/trades/stats/summary'),
        api.get('/api/trades?limit=5'),
        api.get('/api/bot/status')
      ])
      setStats(statsRes.data)
      setRecentTrades(tradesRes.data.trades)
      setBotStatus(botRes.data)
    } catch { /* ignore */ }
  }

  const pnlPositive = stats.totalPnl >= 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-vecna-muted text-sm mt-1">Welcome back, <span className="text-vecna-accent">{user?.username}</span></p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Activity size={18} />} label="Open Trades" value={stats.open} color="accent" />
        <StatCard icon={<DollarSign size={18} />} label="Total P&L" value={`${pnlPositive ? '+' : ''}$${stats.totalPnl.toFixed(2)}`} color={pnlPositive ? 'green' : 'red'} />
        <StatCard icon={<Target size={18} />} label="Win Rate" value={`${stats.winRate}%`} color="gold" />
        <StatCard icon={<Zap size={18} />} label="Bot Status" value={botStatus.isRunning ? 'Running' : 'Stopped'} color={botStatus.isRunning ? 'green' : 'red'} />
      </div>

      {/* Recent trades */}
      <div className="vecna-card">
        <div className="p-4 border-b border-vecna-border">
          <h2 className="text-white font-semibold">Recent Trades</h2>
        </div>
        <div className="overflow-x-auto">
          {recentTrades.length === 0 ? (
            <div className="p-8 text-center text-vecna-muted">No trades yet. Start the bot to begin trading.</div>
          ) : (
            <table className="w-full data-table text-sm">
              <thead>
                <tr className="text-vecna-muted border-b border-vecna-border">
                  <th className="px-4 py-3 text-left">Symbol</th>
                  <th className="px-4 py-3 text-right">Entry</th>
                  <th className="px-4 py-3 text-right">Leverage</th>
                  <th className="px-4 py-3 text-right">Funding</th>
                  <th className="px-4 py-3 text-right">P&L</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map(t => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-mono text-white font-medium">{t.symbol}</td>
                    <td className="px-4 py-3 text-right font-mono text-vecna-muted">${t.entryPrice.toFixed(4)}</td>
                    <td className="px-4 py-3 text-right"><span className="text-vecna-accent font-mono">{t.leverage}x</span></td>
                    <td className="px-4 py-3 text-right font-mono text-vecna-red">{t.fundingRate.toFixed(4)}%</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {t.pnl !== undefined && t.pnl !== null
                        ? <span className={t.pnl >= 0 ? 'text-vecna-green' : 'text-vecna-red'}>{t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}</span>
                        : <span className="text-vecna-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.status === 'OPEN' ? 'bg-vecna-green/10 text-vecna-green' : 'bg-vecna-muted/10 text-vecna-muted'}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    accent: 'text-vecna-accent bg-vecna-accent/10',
    green: 'text-vecna-green bg-vecna-green/10',
    red: 'text-vecna-red bg-red-500/10',
    gold: 'text-vecna-gold bg-yellow-500/10',
  }
  return (
    <div className="vecna-card p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
        <span className="text-vecna-muted text-xs">{label}</span>
      </div>
      <div className={`text-xl font-bold font-mono ${colorMap[color].split(' ')[0]}`}>{value}</div>
    </div>
  )
}
