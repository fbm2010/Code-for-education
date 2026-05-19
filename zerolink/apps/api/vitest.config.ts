import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    testTimeout: 15000,
    hookTimeout: 15000,
    sequence:    { shuffle: false },
    include:     ['src/__tests__/**/*.test.ts'],
  },
});
