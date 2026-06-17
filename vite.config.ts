import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/medi-alert/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    mode === 'production' && VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Medi-alert',
        short_name: 'Medi-alert',
        description: 'Recordatorio de medicamentos',
        theme_color: '#0891B2',
        background_color: '#F0FDFA',
        display: 'standalone',
        start_url: '/medi-alert/',
        scope: '/medi-alert/',
        icons: [
          { src: '/medi-alert/icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: '/medi-alert/icons/512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ].filter(Boolean),
}))
