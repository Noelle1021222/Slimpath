import { mergeConfig } from 'vite'
import { defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }),
)
