import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/helpers/setup.js'],
    include: ['tests/**/*.test.js'],
    exclude: [
      '**/node_modules/**',
      '**/.vscode/**',
      '**/AppData/**',
      '**/Local Settings/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.js',
      ],
    },
    // Allow tests to use fake timers for time-based tests
    fakeTimers: {
      toFake: ['Date', 'setTimeout', 'setInterval']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

