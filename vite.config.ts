import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
    })
  ],

  resolve: {
    alias: {
      '@': '/src',
    },
  },

  build: {
    // Remove console.* e debugger do bundle de produção
    drop: ['console', 'debugger'],
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'charts': ['recharts'],
          'ui': ['lucide-react', 'date-fns'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})