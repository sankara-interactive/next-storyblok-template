import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'lib/**/*.test.ts',
      'app/**/*.test.ts',
      'generators/**/*.test.ts',
      'scripts/**/*.test.ts',
    ],
    env: {
      NEXT_PUBLIC_STORYBLOK_TOKEN: 'test-token',
      STORYBLOK_PREVIEW_TOKEN: 'test-token',
      API_SECRET: 'test-secret',
      STORYBLOK_WEBHOOK_SECRET: 'test-secret',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
      'server-only': path.resolve(import.meta.dirname, '__mocks__/server-only.ts'),
    },
  },
})
