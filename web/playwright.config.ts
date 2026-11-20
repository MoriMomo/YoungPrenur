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
 * PLAYWRIGHT_CHANNEL can point at an installed browser such as "chrome" instead of Playwright's Chromium.
 * For alternate ports, set MDIP_E2E_API_PORT and MDIP_E2E_WEB_PORT, and point the build's
 * NEXT_PUBLIC_API_URL to the alternate API origin.
 */
const API_PORT = Number(process.env.MDIP_E2E_API_PORT || 8000);
const WEB_PORT = Number(process.env.MDIP_E2E_WEB_PORT || 3100);
const WEB_ORIGIN = `http://localhost:${WEB_PORT}`;
const python = process.env.MDIP_PYTHON || "python";
const dbPath = path.join(os.tmpdir(), `mdip-e2e-${process.pid}.db`);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: WEB_ORIGIN,
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
      command: `"${python}" -m uvicorn main:app --port ${API_PORT}`,
      cwd: path.join(__dirname, "..", "backend"),
      url: `http://127.0.0.1:${API_PORT}/health`,
      env: { MDIP_DB_PATH: dbPath, MDIP_CORS_ORIGINS: WEB_ORIGIN },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `"${process.execPath}" node_modules/next/dist/bin/next start -p ${WEB_PORT}`,
      url: WEB_ORIGIN,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
