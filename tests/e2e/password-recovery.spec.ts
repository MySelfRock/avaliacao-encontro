import { test, expect } from '@playwright/test';

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

test.describe('Password Recovery Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/forgot-password`);
  });

  test('should display forgot password form', async ({ page }) => {
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Email inválido')).toBeVisible();
  });

  test('should show success message for valid email submission', async ({ page }) => {
    await page.fill('input[name="email"]', 'test@test.com');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Você receberá')).toBeVisible({ timeout: 10000 });
  });

  test('should return to login page', async ({ page }) => {
    await page.click('text=Voltar para Login');
    
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Reset Password Flow', () => {
  const validResetToken = 'valid-reset-token';
  const invalidResetToken = 'invalid-token';

  test('should display reset password form with valid token', async ({ page }) => {
    await page.goto(`${BASE_URL}/reset-password?token=${validResetToken}`);
    
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
  });

  test('should show error with invalid token', async ({ page }) => {
    await page.goto(`${BASE_URL}/reset-password?token=${invalidResetToken}`);
    
    await expect(page.locator('text=Token inválido')).toBeVisible({ timeout: 10000 });
  });

  test('should show validation error for weak password', async ({ page }) => {
    await page.goto(`${BASE_URL}/reset-password?token=${validResetToken}`);
    
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'weak');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=8 caracteres')).toBeVisible();
  });

  test('should show error for password mismatch', async ({ page }) => {
    await page.goto(`${BASE_URL}/reset-password?token=${validResetToken}`);
    
    await page.fill('input[name="password"]', 'Password123');
    await page.fill('input[name="confirmPassword"]', 'Password456');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=senhas não coincidem')).toBeVisible();
  });

  test('should reset password successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/reset-password?token=${validResetToken}`);
    
    await page.fill('input[name="password"]', 'NewPassword123');
    await page.fill('input[name="confirmPassword"]', 'NewPassword123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Senha redefinida')).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to login after successful reset', async ({ page }) => {
    await page.goto(`${BASE_URL}/reset-password?token=${validResetToken}`);
    
    await page.fill('input[name="password"]', 'NewPassword123');
    await page.fill('input[name="confirmPassword"]', 'NewPassword123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });
});

test.describe('Email Links Security', () => {
  test('should not accept expired tokens', async ({ page }) => {
    await page.goto(`${BASE_URL}/reset-password?token=expired-token`);
    
    await expect(page.locator('text=expirado')).toBeVisible();
  });

  test('should not accept used tokens twice', async ({ page }) => {
    await page.goto(`${BASE_URL}/reset-password?token=used-token`);
    
    await expect(page.locator('text=já utilizado')).toBeVisible();
  });
});