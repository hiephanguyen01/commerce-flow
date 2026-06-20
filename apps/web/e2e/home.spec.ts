import { expect, test } from '@playwright/test';

test('displays the Vietnamese home page', async ({ page }) => {
  await page.goto('/vi');

  await expect(
    page.getByRole('heading', {
      name: 'CommerceFlow',
    }),
  ).toBeVisible();

  await expect(page).toHaveURL(/\/vi$/);
});

test('displays the English home page', async ({ page }) => {
  await page.goto('/en');

  await expect(
    page.getByRole('heading', {
      name: 'CommerceFlow',
    }),
  ).toBeVisible();

  await expect(page).toHaveURL(/\/en$/);
});
