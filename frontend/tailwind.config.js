/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        vecna: {
          bg: '#0A0A0F',
          surface: '#111118',
          card: '#16161F',
          border: '#1E1E2D',
          accent: '#6C3BF5',
          'accent-light': '#8B5CF6',
          gold: '#F59E0B',
          green: '#10B981',
          red: '#EF4444',
          text: '#E2E8F0',
          muted: '#64748B',
        }
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        glow: {
          'from': { boxShadow: '0 0 5px #6C3BF5, 0 0 10px #6C3BF5' },
          'to': { boxShadow: '0 0 10px #6C3BF5, 0 0 25px #6C3BF5, 0 0 50px #6C3BF540' },
        },
        slideIn: {
          'from': { transform: 'translateY(-10px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
      }
    },
  },
  plugins: [],
}
