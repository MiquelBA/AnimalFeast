import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the build works from any folder.
  base: './',
  // One JS file and one CSS file, so the build can be inlined into a single page.
  build: { assetsInlineLimit: 100_000_000, cssCodeSplit: false, modulePreload: false },
})
