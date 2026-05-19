import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'], variable: '--font-geist' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Vecna Shorts — Funding Rate Bot',
  description: '24/7 Binance Futures Funding Rate Shorting Bot',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        {children}
        <Toaster position="top-right" toastOptions={{
          style: { background: '#16161F', color: '#E2E8F0', border: '1px solid #1E1E2D' },
          success: { iconTheme: { primary: '#10B981', secondary: '#16161F' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#16161F' } },
        }} />
      </body>
    </html>
  )
}
