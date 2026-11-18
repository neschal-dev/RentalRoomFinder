import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // The test files share one database and each one wipes it, so they must not run side by side.
    fileParallelism: false,
  },
});
