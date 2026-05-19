'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuthStore()
  const [form, setForm] = useState({ username: '', email: '', password: '', inviteCode: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username || !form.email || !form.password || !form.inviteCode) return toast.error('Fill all fields')
    if (form.password.length < 6) return toast.error('Password must be 6+ characters')
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created!')
      router.push('/dashboard')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      toast.error(error.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-vecna-bg flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-vecna-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-slide-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-vecna-accent to-purple-400 rounded-xl flex items-center justify-center text-white font-bold text-lg glow-purple">V</div>
            <span className="text-2xl font-bold text-white tracking-tight">Vecna <span className="text-vecna-accent">Shorts</span></span>
          </div>
          <p className="text-vecna-muted text-sm">Create your account</p>
        </div>

        <div className="vecna-card p-8">
          <div className="flex items-center gap-2 bg-vecna-accent/10 border border-vecna-accent/20 rounded-lg p-3 mb-6">
            <span className="text-vecna-accent text-sm">🔑</span>
            <p className="text-sm text-vecna-muted">Invite code required to register</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-vecna-muted mb-2">Invite Code</label>
              <input className="vecna-input font-mono uppercase" placeholder="XXXXXXXXXXXXXXXX" value={form.inviteCode}
                onChange={e => setForm(p => ({ ...p, inviteCode: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="block text-sm text-vecna-muted mb-2">Username</label>
              <input className="vecna-input" placeholder="Choose a username" value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-vecna-muted mb-2">Email</label>
              <input type="email" className="vecna-input" placeholder="your@email.com" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-vecna-muted mb-2">Password</label>
              <input type="password" className="vecna-input" placeholder="Min. 6 characters" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-vecna-muted text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-vecna-accent hover:text-vecna-accent-light transition-colors">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
