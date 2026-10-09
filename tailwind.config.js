/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#C40018',
          'red-dark': '#9B0013',
          'red-light': '#E8001F',
          black: '#0B0C10',
          'gray-900': '#161925',
          'gray-800': '#1E2235',
          'gray-700': '#252A3A',
          'gray-600': '#2E3347',
          'gray-500': '#3D4460',
          'gray-400': '#64748B',
          'gray-300': '#94A3B8',
          'gray-200': '#CBD5E1',
          'gray-100': '#E2E8F0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.6)',
        'red-glow': '0 0 20px rgba(196,0,24,0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-red': 'pulseRed 2s infinite',
        'breathe-login': 'breatheLogin 4s ease-in-out infinite',
        'shimmer-text': 'shimmerText 2.5s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(196,0,24,0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(196,0,24,0)' },
        },
        shimmerText: {
          '0%':   { backgroundPosition: '0% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        breatheLogin: {
          '0%, 100%': {
            boxShadow: '0 0 12px rgba(196,0,24,0.08), 0 32px 80px -20px rgba(0,0,0,0.85)',
          },
          '50%': {
            boxShadow: '0 0 24px rgba(196,0,24,0.16), 0 0 48px rgba(196,0,24,0.05), 0 32px 80px -20px rgba(0,0,0,0.85)',
          },
        },
      },
    },
  },
  plugins: [],
}
