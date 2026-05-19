'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username || !form.password) return toast.error('Fill all fields')
    setLoading(true)
    try {
      await login(form.username, form.password)
      toast.success('Welcome back!')
      router.push('/dashboard')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      toast.error(error.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-vecna-bg flex items-center justify-center p-4">
      {/* Background effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-vecna-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-900/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-slide-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-vecna-accent to-purple-400 rounded-xl flex items-center justify-center text-white font-bold text-lg glow-purple">V</div>
            <span className="text-2xl font-bold text-white tracking-tight">Vecna <span className="text-vecna-accent">Shorts</span></span>
          </div>
          <p className="text-vecna-muted text-sm">Funding Rate Arbitrage Bot</p>
        </div>

        <div className="vecna-card p-8">
          <h1 className="text-xl font-semibold text-white mb-6">Sign In</h1>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-vecna-muted mb-2">Username</label>
              <input
                className="vecna-input"
                placeholder="Enter username"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm text-vecna-muted mb-2">Password</label>
              <input
                type="password"
                className="vecna-input"
                placeholder="Enter password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                autoComplete="current-password"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-vecna-muted text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-vecna-accent hover:text-vecna-accent-light transition-colors">
              Register with invite code
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
