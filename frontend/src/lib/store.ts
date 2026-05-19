import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface User {
  id: string
  username: string
  role: 'OWNER' | 'USER'
}

interface AuthState {
  token: string | null
  user: User | null
  login: (username: string, password: string) => Promise<void>
  register: (data: { username: string; email: string; password: string; inviteCode: string }) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: async (username, password) => {
        const res = await axios.post(`${API}/api/auth/login`, { username, password })
        set({ token: res.data.token, user: res.data.user })
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
      },
      register: async (data) => {
        const res = await axios.post(`${API}/api/auth/register`, data)
        set({ token: res.data.token, user: res.data.user })
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
      },
      logout: () => {
        set({ token: null, user: null })
        delete axios.defaults.headers.common['Authorization']
      },
    }),
    { name: 'vecna-auth' }
  )
)

// Initialize axios auth header on app load
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('vecna-auth')
  if (stored) {
    try {
      const { state } = JSON.parse(stored)
      if (state?.token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
      }
    } catch { /* ignore */ }
  }
}

export const api = axios.create({ baseURL: API })
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('vecna-auth')
  if (stored) {
    try {
      const { state } = JSON.parse(stored)
      if (state?.token) config.headers.Authorization = `Bearer ${state.token}`
    } catch { /* ignore */ }
  }
  return config
})
