import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'Password123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Email inválido')).toBeVisible();
  });

  test('should show validation error for empty credentials', async ({ page }) => {
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Email é obrigatório')).toBeVisible();
  });

  test('should show error for wrong credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'wrong@test.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Email ou senha incorretos')).toBeVisible({ timeout: 10000 });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'Admin123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/(\/admin|\/encontros)/, { timeout: 10000 });
  });

  test('should access forgot password page', async ({ page }) => {
    await page.click('text=Esqueci a minha senha');
    
    await expect(page).toHaveURL(/forgot-password/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.fill('testpassword');
    
    const toggleButton = page.locator('button[aria-label="Toggle password visibility"]');
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  test('should show loading state during submission', async ({ page }) => {
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'Admin123');
    
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    await expect(submitButton).toBeDisabled();
  });
});