/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves the site from https://<user>.github.io/<repo>/,
// so production assets must be prefixed with the repository name.
// Change this if you rename the repository (or use '/' for a custom domain).
const REPO_BASE = '/Sorting-Logic/'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? REPO_BASE : '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}))
