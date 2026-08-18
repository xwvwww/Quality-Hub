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

test('обрабатывает параллельные запросы сводки', async ({ request }) => {
  const login = await request.post('/api/auth/login', { data: { email: 'admin@example.com', password: 'Admin123!' } });
  expect(login.ok()).toBe(true);
  const { accessToken } = await login.json();
  const started = performance.now();
  const responses = await Promise.all(Array.from({ length: 30 }, () => request.get('/api/reports/summary', { headers: { Authorization: `Bearer ${accessToken}` } })));
  expect(responses.every((response) => response.ok())).toBe(true);
  expect(performance.now() - started).toBeLessThan(10_000);
});

test('ограничивает повторные попытки входа', async ({ request }) => {
  const statuses: number[] = [];
  for (let attempt = 0; attempt < 9; attempt++) {
    const response = await request.post('/api/auth/login', { data: { email: 'admin@example.com', password: 'Wrong123!' } });
    statuses.push(response.status());
    if (response.status() === 429) break;
  }
  expect(statuses).toContain(429);
});
