import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("homepage loads and displays heading", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("login page has email input", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /send magic link/i })).toBeVisible();
  });

  test("login page shows error when visiting with error param", async ({ page }) => {
    await page.goto("/login?error=OAuthSignin");
    await expect(page.getByText(/sign in|error|configuration/i)).toBeVisible();
  });

  test("returns 404 for unknown routes", async ({ page }) => {
    const response = await page.goto("/this-path-does-not-exist");
    expect(response?.status()).toBe(404);
  });

  test("dashboard redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});

test.describe("Page Load Smoke Tests", () => {
  const publicPages = [
    "/",
    "/login",
    "/terms",
    "/privacy",
  ];

  for (const path of publicPages) {
    test(`${path} returns 200`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
    });
  }
});
