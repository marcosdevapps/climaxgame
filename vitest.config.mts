import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'components/**/*.test.{ts,tsx}', 'app/**/*.test.{ts,tsx}'],
  },
})
