import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/tests/**', 'node_modules', 'dist'],
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
