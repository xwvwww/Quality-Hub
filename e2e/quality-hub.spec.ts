import { expect, test } from '@playwright/test';
test('администратор входит и открывает основные разделы', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');
  await page.locator('input[type="email"]').fill('admin@example.com');
  await page.locator('input[type="password"]').fill('Admin123!');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByText('Quality Hub').first()).toBeVisible();
  const storedSession = await page.evaluate(() => JSON.parse(localStorage.getItem('quality-hub-session') ?? '{}'));
  expect(storedSession.refreshToken).toBeUndefined();
  const refreshCookie = (await page.context().cookies()).find((cookie) => cookie.name === 'quality_hub_refresh');
  expect(refreshCookie?.httpOnly).toBe(true);
  expect(refreshCookie?.sameSite).toBe('Strict');
  for (const path of ['/test-cases', '/defects', '/analytics']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
  expect(consoleErrors).toEqual([]);
});
