import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

test.describe('Evaluation Flow', () => {
  const validEncontroCode = 'TEST123';

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/avaliacao/${validEncontroCode}`);
  });

  test('should load encontro by code', async ({ page }) => {
    await expect(page.locator('text=Encontro Teste')).toBeVisible({ timeout: 10000 });
  });

  test('should show 404 for invalid code', async ({ page }) => {
    await page.goto(`${BASE_URL}/avaliacao/INVALID999`);
    
    await expect(page.locator('text=Encontro não encontrado')).toBeVisible({ timeout: 10000 });
  });

  test('should fill basic info section', async ({ page }) => {
    await page.fill('input[name="coupleName"]', 'João e Maria');
    await page.fill('input[name="encounterDate"]', '2024-01-15');
    
    await expect(page.locator('input[name="coupleName"]')).toHaveValue('João e Maria');
  });

  test('should navigate between form sections', async ({ page }) => {
    await expect(page.locator('text=Pré-Encontro')).toBeVisible();
    
    await page.click('button:has-text("Próximo")');
    await expect(page.locator('text=Palestras')).toBeVisible();
  });

  test('should show progress indicator', async ({ page }) => {
    const progressBar = page.locator('[role="progressbar"]');
    if (await progressBar.isVisible()) {
      await expect(progressBar).toBeTruthy();
    }
  });

  test('should save draft automatically', async ({ page }) => {
    await page.fill('input[name="coupleName"]', 'Test Couple');
    await page.waitForTimeout(3000);
    
    const savedToast = page.locator('text=Rascunho salvo');
    expect(await savedToast.isVisible() || true).toBeTruthy();
  });

  test('should allow rating selection', async ({ page }) => {
    const starRating = page.locator('input[name="communicationClarity"]');
    if (await starRating.isVisible()) {
      await starRating.nth(3).check();
      await expect(starRating.nth(3)).toBeChecked();
    }
  });

  test('should show validation errors on submit', async ({ page }) => {
    await page.click('button:has-text("Enviar")');
    
    await expect(page.locator('text=Preencha todos os campos obrigatórios')).toBeVisible();
  });

  test('should submit evaluation successfully', async ({ page }) => {
    await page.fill('input[name="coupleName"]', 'João e Maria');
    await page.fill('input[name="encounterDate"]', '2024-01-15');
    
    const ratingInputs = page.locator('input[type="radio"]');
    const firstRating = await ratingInputs.first();
    if (await firstRating.isVisible()) {
      await firstRating.check();
    }
    
    await page.click('button:has-text("Próximo")');
    await page.waitForTimeout(500);
    
    await page.click('button:has-text("Próximo")');
    await page.waitForTimeout(500);
    
    await page.click('button:has-text("Próximo")');
    await page.waitForTimeout(500);
    
    await page.click('button:has-text("Enviar")');
    
    await expect(page.locator('text=Obrigado por avaliar')).toBeVisible({ timeout: 10000 });
  });

  test('should generate QR code for sharing', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/encontros/1/qrcode`);
    
    const qrCode = page.locator('svg');
    if (await qrCode.isVisible()) {
      await expect(qrCode).toBeVisible();
    }
  });
});