import { test, expect } from "@playwright/test";

/**
 * Auth flows on the Expo web build. The happy-path login is covered by
 * e2e/auth.setup.ts (every other spec starts from that authenticated state).
 */
test.describe("auth", () => {
  test.describe("logged out", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("shows an error for invalid credentials", async ({ page }) => {
      await page.goto("/login");
      await page.getByPlaceholder("Email").fill("nobody@example.com");
      await page.getByPlaceholder("Password").fill("wrongpassword");
      await page.getByText("Sign in", { exact: true }).last().click();
      await expect(
        page.getByText("Invalid email or password.")
      ).toBeVisible();
    });

    test("redirects unauthenticated visits to /login", async ({ page }) => {
      await page.goto("/tasks");
      await page.waitForURL("**/login");
    });

    test("toggles to account creation mode", async ({ page }) => {
      await page.goto("/login");
      await page.getByText("No account? Create one", { exact: true }).click();
      await expect(
        page.getByText("Create account", { exact: true }).last()
      ).toBeVisible();
    });
  });

  test("signs out back to /login", async ({ page }) => {
    await page.goto("/tasks");
    await page.getByTestId("profile-menu").click();
    await page.getByText("Sign Out", { exact: true }).click();
    await page.waitForURL("**/login");
  });
});
