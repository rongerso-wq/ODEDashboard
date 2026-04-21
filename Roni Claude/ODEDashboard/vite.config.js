import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    // During development, proxy API calls to a local serverless function simulator
    // For now, you'll test with real deployment to Vercel
  },
})
