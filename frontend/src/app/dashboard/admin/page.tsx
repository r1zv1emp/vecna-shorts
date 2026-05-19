'use client'
import { useEffect, useState } from 'react'
import { api, useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Copy, Trash2, Users, BarChart2, Star, Key } from 'lucide-react'
import { format } from 'date-fns'

interface InviteCode {
  id: string; code: string; isUsed: boolean; usedAt?: string; expiresAt?: string; createdAt: string
}
interface User {
  id: string; username: string; email: string; isActive: boolean; createdAt: string
}
interface Stats {
  totalUsers: number; totalTrades: number; openTrades: number; goldenCoins: number; totalPnl: number
}

type Tab = 'overview' | 'invites' | 'users'

export default function AdminPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [expireDays, setExpireDays] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (user?.role !== 'OWNER') { router.push('/dashboard'); return }
    loadAll()
  }, [user, router])

  const loadAll = async () => {
    const [s, c, u] = await Promise.allSettled([
      api.get('/api/admin/stats'),
      api.get('/api/admin/invite-codes'),
      api.get('/api/admin/users'),
    ])
    if (s.status === 'fulfilled') setStats(s.value.data)
    if (c.status === 'fulfilled') setCodes(c.value.data)
    if (u.status === 'fulfilled') setUsers(u.value.data)
  }

  const generateCode = async () => {
    setGenerating(true)
    try {
      const body: Record<string, number> = {}
      if (expireDays) body.expiresInDays = parseInt(expireDays)
      const res = await api.post('/api/admin/invite-codes/generate', body)
      setCodes(prev => [res.data, ...prev])
      toast.success('Invite code generated!')
    } catch { toast.error('Failed') } finally { setGenerating(false) }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Copied!')
  }

  const deleteCode = async (id: string) => {
    await api.delete(`/api/admin/invite-codes/${id}`)
    setCodes(c => c.filter(x => x.id !== id))
    toast.success('Deleted')
  }

  const toggleUser = async (id: string) => {
    const res = await api.patch(`/api/admin/users/${id}/toggle`)
    setUsers(u => u.map(x => x.id === id ? { ...x, isActive: res.data.isActive } : x))
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 size={14} /> },
    { id: 'invites', label: 'Invite Codes', icon: <Key size={14} /> },
    { id: 'users', label: 'Users', icon: <Users size={14} /> },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <p className="text-vecna-muted text-sm mt-1">Manage users, invite codes, and system overview</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-vecna-surface rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-vecna-accent text-white' : 'text-vecna-muted hover:text-white'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: <Users size={16} /> },
            { label: 'Total Trades', value: stats.totalTrades, icon: <BarChart2 size={16} /> },
            { label: 'Open Trades', value: stats.openTrades, icon: <BarChart2 size={16} /> },
            { label: 'Golden Coins', value: stats.goldenCoins, icon: <Star size={16} /> },
            { label: 'System P&L', value: `$${Number(stats.totalPnl).toFixed(2)}`, icon: <BarChart2 size={16} /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="vecna-card p-4">
              <div className="flex items-center gap-2 mb-2 text-vecna-muted">{icon}<span className="text-xs">{label}</span></div>
              <div className="text-2xl font-bold font-mono text-white">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Invite codes */}
      {tab === 'invites' && (
        <div className="space-y-4">
          <div className="vecna-card p-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm text-vecna-muted mb-2">Expire in days (optional)</label>
              <input type="number" min={1} className="vecna-input w-36" placeholder="No expiry"
                value={expireDays} onChange={e => setExpireDays(e.target.value)} />
            </div>
            <button onClick={generateCode} disabled={generating}
              className="btn-primary flex items-center gap-2 disabled:opacity-50">
              <Plus size={16} />Generate Code
            </button>
          </div>

          <div className="vecna-card overflow-hidden">
            <table className="w-full data-table text-sm">
              <thead>
                <tr className="text-vecna-muted border-b border-vecna-border text-xs uppercase">
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Expires</th>
                  <th className="px-4 py-3 text-right">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map(c => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-mono text-white text-sm">{c.code}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${c.isUsed ? 'bg-vecna-muted/10 text-vecna-muted' : 'bg-vecna-green/10 text-vecna-green'}`}>
                        {c.isUsed ? 'Used' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-vecna-muted text-xs">
                      {c.expiresAt ? format(new Date(c.expiresAt), 'MMM dd yyyy') : '∞ Never'}
                    </td>
                    <td className="px-4 py-3 text-right text-vecna-muted text-xs">{format(new Date(c.createdAt), 'MMM dd yyyy')}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!c.isUsed && (
                          <button onClick={() => copyCode(c.code)} className="p-1.5 rounded hover:bg-vecna-card text-vecna-muted hover:text-white transition-colors">
                            <Copy size={13} />
                          </button>
                        )}
                        <button onClick={() => deleteCode(c.id)} className="p-1.5 rounded hover:bg-red-500/10 text-vecna-muted hover:text-vecna-red transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {codes.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-vecna-muted">No invite codes yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="vecna-card overflow-hidden">
          <table className="w-full data-table text-sm">
            <thead>
              <tr className="text-vecna-muted border-b border-vecna-border text-xs uppercase">
                <th className="px-4 py-3 text-left">Username</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Joined</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-white">{u.username}</td>
                  <td className="px-4 py-3 text-vecna-muted text-xs">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${u.isActive ? 'bg-vecna-green/10 text-vecna-green' : 'bg-vecna-red/10 text-vecna-red'}`}>
                      {u.isActive ? 'Active' : 'Banned'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-vecna-muted text-xs">{format(new Date(u.createdAt), 'MMM dd yyyy')}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggleUser(u.id)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${u.isActive ? 'bg-red-500/10 text-vecna-red hover:bg-red-500/20' : 'bg-vecna-green/10 text-vecna-green hover:bg-vecna-green/20'}`}>
                      {u.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-vecna-muted">No users yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
