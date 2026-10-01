import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the built assets work both at the root of a domain and
// under a GitHub Pages project subpath (https://<user>.github.io/<repo>/)
// without needing to hardcode the repository name here.
export default defineConfig({
  base: './',
  plugins: [react()],
})
