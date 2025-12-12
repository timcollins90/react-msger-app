import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/msg/',
  build: {
	outDir: path.resolve(__dirname, '../public/msg'),
	emptyOutDir: true,
  }
})
