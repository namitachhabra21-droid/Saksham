import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads and shows the core pitch", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Say What You Know/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Admin Login" }).first()).toBeVisible();
  });

  test("admin login link navigates to the admin sign-in page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Admin Login" }).first().click();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("legal pages exist and link from the footer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Privacy Policy" }).click();
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    await page.goBack();
    await page.getByRole("link", { name: "Terms of Service" }).click();
    await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
  });
});
