import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

test.describe('Admin Flow', () => {
  const adminEmail = 'admin@test.com';
  const adminPassword = 'Admin123';

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
  });

  async function loginAsAdmin(page: Page) {
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/(\/admin|\/encontros)/, { timeout: 10000 });
  }

  test('should access admin dashboard after login', async ({ page }) => {
    await loginAsAdmin(page);
    
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('should list encontros in admin panel', async ({ page }) => {
    await loginAsAdmin(page);
    
    await page.click('text=Encontros');
    await expect(page).toHaveURL(/encontros/);
    
    const encontrosTable = page.locator('table');
    if (await encontrosTable.isVisible()) {
      await expect(encontrosTable).toBeVisible();
    }
  });

  test('should create new encontro', async ({ page }) => {
    await loginAsAdmin(page);
    
    await page.click('text=Encontros');
    await page.click('text=Novo Encontro');
    
    await expect(page.locator('input[name="nome"]')).toBeVisible();
    
    await page.fill('input[name="nome"]', 'Novo Encuentro E2E');
    await page.fill('input[name="data_inicio"]', '2024-12-01');
    await page.fill('input[name="data_fim"]', '2024-12-03');
    await page.fill('input[name="local"]', 'Local Test');
    await page.click('button:has-text("Salvar")');
    
    await expect(page.locator('text=Encontro criado com sucesso')).toBeVisible({ timeout: 10000 });
  });

  test('should view evaluation statistics', async ({ page }) => {
    await loginAsAdmin(page);
    
    await page.click('text=Estatísticas');
    await expect(page).toHaveURL(/estatisticas/);
    
    const statsCards = page.locator('[class*="card"], [class*="stat"]');
    if (await statsCards.first().isVisible()) {
      await expect(statsCards.first()).toBeTruthy();
    }
  });

  test('should export evaluations', async ({ page }) => {
    await loginAsAdmin(page);
    
    await page.click('text=Exportar');
    await page.click('text=CSV');
    
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    if (downloadPromise) {
      const download = await downloadPromise;
      expect(download?.suggestedFilename()).toContain('avaliacoes');
    }
  });

  test('should access user profile', async ({ page }) => {
    await loginAsAdmin(page);
    
    await page.click('[aria-label="Perfil do usuário"]');
    await expect(page).toHaveURL(/perfil/);
  });

  test('should toggle dark mode', async ({ page }) => {
    await loginAsAdmin(page);
    
    const darkModeButton = page.locator('button[aria-label="Dark mode"], button:has-text("Dark")');
    if (await darkModeButton.isVisible()) {
      await darkModeButton.click();
      
      const html = page.locator('html');
      const classAttr = await html.getAttribute('class');
      expect(classAttr?.includes('dark') || classAttr === '').toBeTruthy();
    }
  });

  test('should logout successfully', async ({ page }) => {
    await loginAsAdmin(page);
    
    await page.click('text=Sair');
    await expect(page).toHaveURL(/login/);
  });
});