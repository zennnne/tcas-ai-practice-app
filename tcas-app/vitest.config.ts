import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [react()],
    test: {
      environment: 'node',
      include: ['tests/unit/**/*.test.ts'],
    },
    resolve: { alias: { '@': '/src' } },
  }
})
