import { defineConfig } from "@playwright/test";
import path from "node:path";

const webDir = path.resolve(__dirname, "..");

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  outputDir: "./screenshots",
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: `NOTES_ROOT=${path.join(webDir, "e2e/test-data")} GIT_AUTO_COMMIT_SECS=0 GIT_AUTO_PULL_SECS=0 npx tsx server/src/index.ts`,
    port: 3000,
    reuseExistingServer: false,
    cwd: webDir,
  },
});
