'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/store'
import { onWsEvent } from '@/hooks/useWebSocket'
import { formatDistanceToNow } from 'date-fns'

interface Trade {
  id: string; symbol: string; entryPrice: number; exitPrice?: number
  quantity: number; leverage: number; margin: number; pnl?: number
  fundingRate: number; status: string; closeReason?: string
  openedAt: string; closedAt?: string; duration?: number
  entryOrderId?: string; exitOrderId?: string
}

const STATUS_TABS = ['ALL', 'OPEN', 'CLOSED']

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(0)
  const LIMIT = 20

  useEffect(() => {
    loadTrades()
    const u1 = onWsEvent('TRADE_OPENED', loadTrades)
    const u2 = onWsEvent('TRADE_CLOSED', loadTrades)
    return () => { u1(); u2() }
  }, [status, page])

  const loadTrades = async () => {
    try {
      const params: Record<string, string | number> = { limit: LIMIT, offset: page * LIMIT }
      if (status !== 'ALL') params.status = status
      const res = await api.get('/api/trades', { params })
      setTrades(res.data.trades)
      setTotal(res.data.total)
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Active Trades</h1>
        <p className="text-vecna-muted text-sm mt-1">Monitor your positions and P&L</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-vecna-surface rounded-xl p-1 w-fit">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(0) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${status === s ? 'bg-vecna-accent text-white' : 'text-vecna-muted hover:text-white'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="vecna-card overflow-hidden">
        <div className="overflow-x-auto">
          {trades.length === 0 ? (
            <div className="p-12 text-center text-vecna-muted">No trades found</div>
          ) : (
            <table className="w-full data-table text-sm">
              <thead>
                <tr className="text-vecna-muted border-b border-vecna-border text-xs uppercase">
                  <th className="px-4 py-3 text-left">Symbol</th>
                  <th className="px-4 py-3 text-right">Entry</th>
                  <th className="px-4 py-3 text-right">Exit</th>
                  <th className="px-4 py-3 text-right">Lev.</th>
                  <th className="px-4 py-3 text-right">Margin</th>
                  <th className="px-4 py-3 text-right">Funding</th>
                  <th className="px-4 py-3 text-right">P&L</th>
                  <th className="px-4 py-3 text-right">Reason</th>
                  <th className="px-4 py-3 text-right">Status</th>
                  <th className="px-4 py-3 text-right">Opened</th>
                </tr>
              </thead>
              <tbody>
                {trades.map(t => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-mono font-bold text-white">{t.symbol}</td>
                    <td className="px-4 py-3 text-right font-mono text-vecna-muted">${t.entryPrice.toFixed(4)}</td>
                    <td className="px-4 py-3 text-right font-mono text-vecna-muted">{t.exitPrice ? `$${t.exitPrice.toFixed(4)}` : '—'}</td>
                    <td className="px-4 py-3 text-right"><span className="text-vecna-accent font-mono font-bold">{t.leverage}x</span></td>
                    <td className="px-4 py-3 text-right font-mono text-vecna-muted">${t.margin.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-vecna-red">{t.fundingRate.toFixed(4)}%</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {t.pnl !== undefined && t.pnl !== null
                        ? <span className={t.pnl >= 0 ? 'text-vecna-green' : 'text-vecna-red'}>{t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}</span>
                        : <span className="text-vecna-muted">Live</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.closeReason ? <span className="text-xs text-vecna-muted">{t.closeReason.replace('_', ' ')}</span> : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.status === 'OPEN' ? 'bg-vecna-green/10 text-vecna-green' : 'bg-vecna-muted/10 text-vecna-muted'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-vecna-muted">
                      {formatDistanceToNow(new Date(t.openedAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="p-4 border-t border-vecna-border flex items-center justify-between">
            <span className="text-vecna-muted text-sm">{total} total trades</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1 rounded bg-vecna-card text-vecna-muted text-sm disabled:opacity-40">Prev</button>
              <span className="text-vecna-muted text-sm px-2 py-1">{page + 1} / {Math.ceil(total / LIMIT)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * LIMIT >= total}
                className="px-3 py-1 rounded bg-vecna-card text-vecna-muted text-sm disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
