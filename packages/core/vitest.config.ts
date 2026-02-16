import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@archbase/workspace-types': path.resolve(__dirname, '../types/src'),
      '@archbase/workspace-state': path.resolve(__dirname, '../state/src'),
      '@archbase/workspace-sdk': path.resolve(__dirname, '../sdk/src'),
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
      exclude: [
        'src/**/__tests__/**',
        'src/**/index.ts',
        'src/**/index.tsx',
        'src/**/*.stories.tsx',
        'src/**/*.d.ts',
        'src/App.tsx',
        'src/knownManifests.ts',
      ],
      // Core is UI-heavy — component coverage comes from E2E tests
      // Unit test coverage thresholds apply only to utils/services
      thresholds: undefined,
    },
  },
});
