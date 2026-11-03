import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      // Studio previews stay visible while the agent repairs build errors.
      overlay: false,
    },
  },
})
