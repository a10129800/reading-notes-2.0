import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts/,
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npx tsx server/index.ts',
      url: 'http://127.0.0.1:4000/api/health',
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'npx vite --port 3000 --host 127.0.0.1',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});

