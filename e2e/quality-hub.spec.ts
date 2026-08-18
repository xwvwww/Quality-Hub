import { expect, test } from '@playwright/test';
test('администратор входит и открывает основные разделы', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="email"]').fill('admin@example.com');
  await page.locator('input[type="password"]').fill('Admin123!');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByText('Quality Hub').first()).toBeVisible();
  for (const path of ['/test-cases', '/defects', '/analytics']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});
