/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: [
      'node_modules/**',
      'second-chance-testing/**',
      'dist/**',
      'tests/**/*.e2e.ts',
      'tests/**/*.spec.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'second-chance-testing/'
      ]
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})