import { expect, test, type Page } from "@playwright/test";

const API = `http://127.0.0.1:${process.env.MDIP_E2E_API_PORT || 8000}`;
// Sign-in goes through Supabase Auth, so these tests need a real test account (CI secrets).
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

/** Signs in with the Supabase test account. */
async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).first().fill(EMAIL!);
  await page.getByLabel(/password/i).first().fill(PASSWORD!);
  await page.getByRole("button", { name: /sign in to cockpit/i }).click();
  await page.waitForURL(/\/dashboard/);
}

test("landing page inspects the sample schedule with the live model", async ({ page }) => {
  await page.goto("/");
  const inspection = page.waitForResponse((r) => r.url().includes("/scheduler/inspect"));
  await page.getByRole("button", { name: /use the sample schedule/i }).click();
  expect((await inspection).status()).toBe(200);

  await expect(page.getByText(/chance the project misses its due date/i).first()).toBeVisible();
  const verdicts = page.locator("table").first().getByText(/^(hold|watch|pass|complete)$/i);
  await expect(verdicts.first()).toBeVisible();
  expect(await verdicts.count()).toBeGreaterThan(3);
});

test.describe("Supabase sign-in", () => {
  test.skip(!EMAIL || !PASSWORD, "set E2E_EMAIL and E2E_PASSWORD to run sign-in tests");

  test("signed-in user loads the sample schedule on the scheduler", async ({ page }) => {
    await signIn(page);
    await page.goto("/dashboard/scheduler");
    const upload = page.waitForResponse((r) => r.url().includes("/scheduler/upload"));
    await page.getByRole("button", { name: /load sample schedule/i }).click();
    const res = await upload;
    expect(res.status()).toBe(200);
    expect(res.request().headers()["authorization"]).toMatch(/^Bearer /);
    await expect(page.getByText("WBS-1.1").first()).toBeVisible();
  });
});

test("the API refuses anonymous writes", async ({ request }) => {
  const res = await request.post(`${API}/api/v1/risks/decisions/flag`, {
    data: { action_id: "act-01", reviewer_role: "Plant Manager" },
  });
  expect(res.status()).toBe(401);
});
