import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@archbase/workspace-types': path.resolve(__dirname, '../types/src'),
      '@archbase/workspace-state': path.resolve(__dirname, '../state/src'),
    },
  },
  test: {
    globals: false,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      enabled: false,
      reporter: ['text', 'text-summary', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/__tests__/**', 'src/**/index.ts'],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
});
