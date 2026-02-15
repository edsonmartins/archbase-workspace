import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@archbase/workspace-types': '../types/src/index.ts',
    },
  },
});
