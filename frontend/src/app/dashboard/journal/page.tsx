'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/store'
import { format } from 'date-fns'

interface Trade {
  id: string; symbol: string; entryPrice: number; exitPrice?: number
  quantity: number; leverage: number; margin: number; pnl?: number
  fundingRate: number; status: string; closeReason?: string
  openedAt: string; closedAt?: string; duration?: number
  entryOrderId?: string; exitOrderId?: string
}

export default function JournalPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [stats, setStats] = useState({ open: 0, closed: 0, totalPnl: 0, winRate: '0' })

  useEffect(() => {
    Promise.all([
      api.get('/api/trades?limit=100&status=CLOSED'),
      api.get('/api/trades/stats/summary')
    ]).then(([t, s]) => {
      setTrades(t.data.trades)
      setStats(s.data)
    }).catch(() => {})
  }, [])

  const totalFunding = trades.reduce((sum, t) => sum + Math.abs(t.fundingRate), 0)
  const avgDuration = trades.filter(t => t.duration).reduce((sum, t) => sum + (t.duration || 0), 0) / (trades.filter(t => t.duration).length || 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Trade Journal</h1>
        <p className="text-vecna-muted text-sm mt-1">Detailed log of all completed trades</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Trades', value: stats.closed },
          { label: 'Total P&L', value: `${stats.totalPnl >= 0 ? '+' : ''}$${Number(stats.totalPnl).toFixed(2)}`, color: stats.totalPnl >= 0 ? 'text-vecna-green' : 'text-vecna-red' },
          { label: 'Win Rate', value: `${stats.winRate}%`, color: 'text-vecna-gold' },
          { label: 'Avg Duration', value: `${avgDuration.toFixed(0)}m` },
        ].map(({ label, value, color = 'text-white' }) => (
          <div key={label} className="vecna-card p-4">
            <div className="text-vecna-muted text-xs mb-2">{label}</div>
            <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Trade log table */}
      <div className="vecna-card overflow-hidden">
        <div className="p-4 border-b border-vecna-border">
          <h2 className="text-white font-semibold">Trade Log</h2>
        </div>
        <div className="overflow-x-auto">
          {trades.length === 0 ? (
            <div className="p-12 text-center text-vecna-muted">No completed trades yet</div>
          ) : (
            <table className="w-full data-table text-xs">
              <thead>
                <tr className="text-vecna-muted border-b border-vecna-border uppercase">
                  {['Coin', 'Entry', 'Exit', 'P&L', 'Funding', 'Lev.', 'Margin', 'Duration', 'Reason', 'Entry ID', 'Exit ID', 'Date'].map(h => (
                    <th key={h} className="px-3 py-3 text-right first:text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map(t => (
                  <tr key={t.id}>
                    <td className="px-3 py-3 font-mono font-bold text-white">{t.symbol}</td>
                    <td className="px-3 py-3 text-right font-mono text-vecna-muted">${t.entryPrice.toFixed(4)}</td>
                    <td className="px-3 py-3 text-right font-mono text-vecna-muted">{t.exitPrice ? `$${t.exitPrice.toFixed(4)}` : '—'}</td>
                    <td className="px-3 py-3 text-right font-mono font-bold">
                      {t.pnl !== undefined && t.pnl !== null ? (
                        <span className={t.pnl >= 0 ? 'text-vecna-green' : 'text-vecna-red'}>
                          {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-vecna-red">{t.fundingRate.toFixed(4)}%</td>
                    <td className="px-3 py-3 text-right text-vecna-accent font-bold">{t.leverage}x</td>
                    <td className="px-3 py-3 text-right font-mono text-vecna-muted">${t.margin.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-vecna-muted">{t.duration ? `${t.duration}m` : '—'}</td>
                    <td className="px-3 py-3 text-right text-vecna-muted">{t.closeReason?.replace('_', ' ') || '—'}</td>
                    <td className="px-3 py-3 text-right font-mono text-vecna-muted/50 text-xs">{t.entryOrderId || '—'}</td>
                    <td className="px-3 py-3 text-right font-mono text-vecna-muted/50 text-xs">{t.exitOrderId || '—'}</td>
                    <td className="px-3 py-3 text-right text-vecna-muted whitespace-nowrap">
                      {format(new Date(t.openedAt), 'MM/dd HH:mm')}
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
