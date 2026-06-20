import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'UvA-IN 멤버십',
        short_name: 'UvA-IN',
        description: 'University of Amsterdam 한국인 학생회 멤버십 앱',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],

  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Vite 8 (Rolldown) requires manualChunks as a function, not an object
        manualChunks(id) {
  if (id.includes('node_modules/@supabase')) {
    return 'vendor-supabase'
  }
  if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
    return 'vendor-map'
  }
  if (id.includes('node_modules/qrcode')) {
    return 'vendor-qr'
  }
},
      },
    },
  },
})
