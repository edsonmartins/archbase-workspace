import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@archbase/workspace-types': path.resolve(__dirname, '../types/src/index.ts'),
      '@archbase/workspace-state': path.resolve(__dirname, '../state/src/index.ts'),
    },
  },
});
