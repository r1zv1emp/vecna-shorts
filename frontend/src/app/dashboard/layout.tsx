'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import {
  LayoutDashboard, TrendingDown, Star, Settings, BookOpen,
  Bot, LogOut, Menu, X, ChevronRight, Shield, Users, Key
} from 'lucide-react'
import { useWebSocket } from '@/hooks/useWebSocket'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview', roles: ['OWNER', 'USER'] },
  { href: '/dashboard/bot', icon: Bot, label: 'Bot Control', roles: ['OWNER', 'USER'] },
  { href: '/dashboard/trades', icon: TrendingDown, label: 'Trades', roles: ['OWNER', 'USER'] },
  { href: '/dashboard/journal', icon: BookOpen, label: 'Journal', roles: ['OWNER', 'USER'] },
  { href: '/dashboard/screener', icon: TrendingDown, label: 'Screener', roles: ['OWNER'] },
  { href: '/dashboard/golden', icon: Star, label: 'Golden Coins', roles: ['OWNER'] },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings', roles: ['OWNER', 'USER'] },
  { href: '/dashboard/admin', icon: Shield, label: 'Admin', roles: ['OWNER'] },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { token, user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useWebSocket()

  useEffect(() => {
    if (!token) router.push('/auth/login')
  }, [token, router])

  if (!token || !user) return (
    <div className="min-h-screen bg-vecna-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-vecna-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(user.role))

  return (
    <div className="min-h-screen bg-vecna-bg flex">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 bg-vecna-surface border-r border-vecna-border z-30 flex flex-col transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="p-6 border-b border-vecna-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-vecna-accent to-purple-400 rounded-xl flex items-center justify-center text-white font-bold glow-purple">V</div>
            <div>
              <div className="text-white font-bold text-sm">Vecna Shorts</div>
              <div className="text-vecna-muted text-xs">Funding Rate Bot</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {visibleNav.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${active ? 'bg-vecna-accent/15 text-vecna-accent-light border border-vecna-accent/20' : 'text-vecna-muted hover:text-white hover:bg-vecna-card'}`}>
                <Icon size={16} className={active ? 'text-vecna-accent' : ''} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={14} className="text-vecna-accent" />}
              </Link>
            )
          })}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-vecna-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-vecna-accent/20 rounded-full flex items-center justify-center text-vecna-accent font-semibold text-sm">
              {user.username[0].toUpperCase()}
            </div>
            <div>
              <div className="text-white text-sm font-medium">{user.username}</div>
              <div className="text-vecna-muted text-xs flex items-center gap-1">
                {user.role === 'OWNER' ? <><Shield size={10} /> Owner</> : <><Users size={10} /> User</>}
              </div>
            </div>
          </div>
          <button onClick={() => { logout(); router.push('/auth/login') }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-vecna-muted hover:text-vecna-red hover:bg-red-500/10 transition-all text-sm">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-14 bg-vecna-surface border-b border-vecna-border flex items-center px-4 gap-4 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-vecna-muted hover:text-white">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-vecna-green rounded-full animate-pulse-slow" />
            <span className="text-vecna-muted text-xs">Live</span>
          </div>
        </header>

        <main className="flex-1 p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  )
}
