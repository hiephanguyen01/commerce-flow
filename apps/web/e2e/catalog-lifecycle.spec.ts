import { expect, test } from '@playwright/test';

test.describe('catalog lifecycle', () => {
  test('published product appears and unpublish removes it', async ({ page }) => {
    await page.goto('/vi/login');

    await page.getByLabel('Email').fill('admin@commerceflow.test');

    await page.getByLabel('Mật khẩu').fill('Admin123!');

    await page
      .getByRole('button', {
        name: /đăng nhập/i,
      })
      .click();

    await page.goto('/vi/admin/products/new');

    await page.getByLabel('Tên sản phẩm').fill('E2E Cached Product');

    await page
      .getByRole('button', {
        name: 'Tạo sản phẩm',
      })
      .click();

    await page
      .getByRole('button', {
        name: /biến thể/i,
      })
      .click();

    await page
      .getByRole('button', {
        name: 'Thêm biến thể',
      })
      .click();

    await page.getByLabel('Tên biến thể').fill('Default');

    await page.getByLabel('SKU').fill(`E2E-${Date.now()}`);

    await page.getByLabel('Giá bán').fill('100000');

    await page
      .getByRole('button', {
        name: 'Tạo biến thể',
      })
      .click();

    await page
      .getByRole('button', {
        name: 'Publish',
      })
      .click();

    page.on('dialog', (dialog) => dialog.accept());

    await expect(page.getByText('Đã xuất bản')).toBeVisible();

    await page.goto('/vi/products?search=E2E%20Cached%20Product');

    await expect(page.getByText('E2E Cached Product')).toBeVisible();

    /*
     * Quay lại admin và unpublish.
     */
    await page.goBack();

    await page
      .getByRole('button', {
        name: 'Unpublish',
      })
      .click();

    await page.goto('/vi/products?search=E2E%20Cached%20Product');

    await expect(page.getByText('E2E Cached Product')).toHaveCount(0);
  });
});
