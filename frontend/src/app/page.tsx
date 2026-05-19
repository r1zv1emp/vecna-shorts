'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

export default function Home() {
  const router = useRouter()
  const { token } = useAuthStore()

  useEffect(() => {
    if (token) router.push('/dashboard')
    else router.push('/auth/login')
  }, [token, router])

  return (
    <div className="min-h-screen bg-vecna-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-vecna-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
