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
  },
});
