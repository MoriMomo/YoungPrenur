import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests against a production build: the FastAPI backend on :8000 (the frontend's default
 * NEXT_PUBLIC_API_URL) with a throwaway database, and `next start` on :3100.
 *
 *   npm run build && npm run test:e2e
 *
 * MDIP_PYTHON picks the Python that has backend/requirements.txt installed (default "python");
 * PLAYWRIGHT_CHANNEL can point at an installed browser such as "msedge" instead of Playwright's Chromium.
 */
const API_PORT = 8000;
const WEB_PORT = 3100;
const python = process.env.MDIP_PYTHON || "python";
const dbPath = path.join(os.tmpdir(), `mdip-e2e-${process.pid}.db`);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
    },
  ],
  webServer: [
    {
      command: `${python} -m uvicorn main:app --port ${API_PORT}`,
      cwd: path.join(__dirname, "..", "backend"),
      url: `http://127.0.0.1:${API_PORT}/health`,
      env: { MDIP_DB_PATH: dbPath },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npx next start -p ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
