import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('public application smoke and accessibility', () => {
  test('home page renders the application shell without runtime errors', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/');
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.getByRole('link', { name: /DevLog/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Log In' })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('login page renders its form and registration navigation', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByPlaceholder('name@example.com')).toBeVisible();
    await expect(page.getByRole('link', { name: /Create Account/i })).toHaveAttribute('href', '/register');
  });

  test('registration route loads directly after a hard refresh', async ({ page }) => {
    const response = await page.goto('/register');
    expect(response?.status()).toBe(200);
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('public pages remain usable at a narrow mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const route of ['/', '/login', '/register']) {
      await page.goto(route);
      await expect(page.locator('#main-content')).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
    }
  });

  for (const route of ['/', '/login', '/register']) {
    test(`has no serious or critical WCAG accessibility violations on ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('#main-content')).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const blockingViolations = results.violations.filter(
        (violation) => violation.impact === 'critical' || violation.impact === 'serious'
      );
      expect(
        blockingViolations.map(({ id, impact, description, nodes }) => ({
          id, impact, description, affectedElements: nodes.map((node) => node.target),
        }))
      ).toEqual([]);
    });
  }
});
