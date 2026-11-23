import { test, expect } from '@playwright/test';

test('staging account can authenticate and retain its session after reload', async ({ page }) => {
  const email = process.env.STAGING_E2E_EMAIL;
  const password = process.env.STAGING_E2E_PASSWORD;
  if (!email || !password) {
    throw new Error('Configure STAGING_E2E_EMAIL and STAGING_E2E_PASSWORD as staging environment secrets.');
  }

  await page.goto('/login');
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.locator('input[type="password"]').fill(password);

  const loginResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/v1/auth/login') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Sign In' }).click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok(), 'staging login API should accept the dedicated test account').toBeTruthy();

  await expect(page).toHaveURL(/\/$/);
  await page.reload();
  await expect(page.locator('#main-content')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Log In' })).toHaveCount(0);
});
