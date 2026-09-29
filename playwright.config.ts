import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E suite for TheTaskApp mobile, driven through its Expo web
 * build (Metro static output). The same dummy-account discipline as the web
 * suite applies: E2E_TEST_EMAIL / E2E_TEST_PASSWORD, never a personal account.
 *
 *   npm run test:e2e
 *
 * Against a hosted web build instead of a local one:
 *
 *   PLAYWRIGHT_BASE_URL=https://<hosted-web-build> npm run test:e2e
 *
 * See e2e/README.md for setup, including the required EXPO_PUBLIC_* env.
 */
export default defineConfig({
  testDir: "./e2e",
  // One worker: specs share a single dummy account backed by Firestore,
  // so parallel workers would race on the same data.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8081",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run web:e2e",
        url: "http://localhost:8081/login",
        reuseExistingServer: !process.env.CI,
        // expo export can take a few minutes on a cold cache.
        timeout: 600_000,
      },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
});
