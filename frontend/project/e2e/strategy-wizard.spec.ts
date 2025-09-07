import { test, expect } from '@playwright/test';

test.describe('Strategy Creation Wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token');
    });
    
    await page.goto('/strategies');
  });

  test('should start strategy creation wizard', async ({ page }) => {
    await page.click('text=Yeni Strateji Oluştur');
    await expect(page.locator('text=Strateji Oluşturma Sihirbazı')).toBeVisible();
    await expect(page.locator('text=Adım 1/7')).toBeVisible();
  });

  test('should complete step 1: Basic Information', async ({ page }) => {
    await page.click('text=Yeni Strateji Oluştur');
    
    // Fill basic information
    await page.fill('input[name="name"]', 'Test Strategy');
    await page.fill('input[name="walletAddress"]', '0x1234567890123456789012345678901234567890');
    await page.selectOption('select[name="exchange"]', 'OKX');
    await page.selectOption('select[name="copyMode"]', 'Perpetual');
    
    // Proceed to next step
    await page.click('button:has-text("İleri")');
    
    await expect(page.locator('text=Adım 2/7')).toBeVisible();
    await expect(page.locator('text=Vadeli İşlem Konfigürasyonu')).toBeVisible();
  });

  test('should validate required fields in step 1', async ({ page }) => {
    await page.click('text=Yeni Strateji Oluştur');
    
    // Try to proceed without filling required fields
    await page.click('button:has-text("İleri")');
    
    await expect(page.locator('text=Strateji adı gerekli')).toBeVisible();
    await expect(page.locator('text=Cüzdan adresi gerekli')).toBeVisible();
  });

  test('should complete step 2: Futures Configuration', async ({ page }) => {
    // Mock navigation to step 2
    await page.click('text=Yeni Strateji Oluştur');
    await page.fill('input[name="name"]', 'Test Strategy');
    await page.fill('input[name="walletAddress"]', '0x1234567890123456789012345678901234567890');
    await page.selectOption('select[name="exchange"]', 'OKX');
    await page.selectOption('select[name="copyMode"]', 'Perpetual');
    await page.click('button:has-text("İleri")');
    
    // Fill futures configuration
    await page.fill('input[name="leverage"]', '10');
    await page.fill('input[name="stopLoss"]', '5');
    await page.fill('input[name="dailyLimit"]', '1000');
    
    // Proceed to next step
    await page.click('button:has-text("İleri")');
    
    await expect(page.locator('text=Adım 3/7')).toBeVisible();
    await expect(page.locator('text=Risk Yönetimi')).toBeVisible();
  });

  test('should validate futures configuration', async ({ page }) => {
    // Navigate to step 2
    await page.click('text=Yeni Strateji Oluştur');
    await page.fill('input[name="name"]', 'Test Strategy');
    await page.fill('input[name="walletAddress"]', '0x1234567890123456789012345678901234567890');
    await page.selectOption('select[name="exchange"]', 'OKX');
    await page.selectOption('select[name="copyMode"]', 'Perpetual');
    await page.click('button:has-text("İleri")');
    
    // Try invalid leverage
    await page.fill('input[name="leverage"]', '150'); // Above max
    await page.click('button:has-text("İleri")');
    
    await expect(page.locator('text=Kaldıraç 125\'ten yüksek olamaz')).toBeVisible();
  });

  test('should complete step 3: Risk Management', async ({ page }) => {
    // Navigate to step 3
    await page.click('text=Yeni Strateji Oluştur');
    await page.fill('input[name="name"]', 'Test Strategy');
    await page.fill('input[name="walletAddress"]', '0x1234567890123456789012345678901234567890');
    await page.selectOption('select[name="exchange"]', 'OKX');
    await page.selectOption('select[name="copyMode"]', 'Perpetual');
    await page.click('button:has-text("İleri")');
    await page.fill('input[name="leverage"]', '10');
    await page.fill('input[name="stopLoss"]', '5');
    await page.fill('input[name="dailyLimit"]', '1000');
    await page.click('button:has-text("İleri")');
    
    // Fill risk management
    await page.selectOption('select[name="riskLevel"]', 'MEDIUM');
    await page.fill('input[name="maxPositionSize"]', '5000');
    
    // Proceed to next step
    await page.click('button:has-text("İleri")');
    
    await expect(page.locator('text=Adım 4/7')).toBeVisible();
    await expect(page.locator('text=İşlem Boyutu')).toBeVisible();
  });

  test('should complete step 4: Position Sizing', async ({ page }) => {
    // Navigate to step 4
    await page.click('text=Yeni Strateji Oluştur');
    // ... (navigate through previous steps)
    
    // Mock API call for getting to step 4
    await page.evaluate(() => {
      const wizard = document.querySelector('[data-testid="strategy-wizard"]');
      if (wizard) {
        wizard.dispatchEvent(new CustomEvent('stepChange', { detail: 4 }));
      }
    });
    
    // Fill position sizing
    await page.selectOption('select[name="sizingMethod"]', 'Fixed Amount');
    await page.fill('input[name="amountPerTrade"]', '100');
    await page.fill('input[name="percentageToCopy"]', '50');
    
    // Proceed to next step
    await page.click('button:has-text("İleri")');
    
    await expect(page.locator('text=Adım 5/7')).toBeVisible();
  });

  test('should complete step 5: Token Selection', async ({ page }) => {
    // Mock navigation to step 5
    await page.click('text=Yeni Strateji Oluştur');
    
    // Add tokens
    await page.click('text=Token Ekle');
    await page.fill('input[placeholder="Token ara"]', 'BTC');
    await page.click('text=BTC');
    await page.click('text=Token Ekle');
    await page.fill('input[placeholder="Token ara"]', 'ETH');
    await page.click('text=ETH');
    
    // Proceed to next step
    await page.click('button:has-text("İleri")');
    
    await expect(page.locator('text=Adım 6/7')).toBeVisible();
  });

  test('should complete step 6: API Configuration', async ({ page }) => {
    // Mock navigation to step 6
    await page.click('text=Yeni Strateji Oluştur');
    
    // Fill API configuration
    await page.fill('input[name="apiKey"]', 'test-api-key');
    await page.fill('input[name="apiSecret"]', 'test-api-secret');
    await page.fill('input[name="passphrase"]', 'test-passphrase');
    
    // Proceed to next step
    await page.click('button:has-text("İleri")');
    
    await expect(page.locator('text=Adım 7/7')).toBeVisible();
    await expect(page.locator('text=Özet ve Onay')).toBeVisible();
  });

  test('should show strategy summary on final step', async ({ page }) => {
    // Mock navigation to step 7
    await page.click('text=Yeni Strateji Oluştur');
    
    // Check summary display
    await expect(page.locator('text=Strateji Özeti')).toBeVisible();
    await expect(page.locator('text=Temel Bilgiler')).toBeVisible();
    await expect(page.locator('text=İşlem Konfigürasyonu')).toBeVisible();
    await expect(page.locator('text=Risk Yönetimi')).toBeVisible();
  });

  test('should save strategy draft', async ({ page }) => {
    await page.click('text=Yeni Strateji Oluştur');
    await page.fill('input[name="name"]', 'Draft Strategy');
    
    // Save draft
    await page.click('text=Taslağı Kaydet');
    
    await expect(page.locator('text=Taslak kaydedildi')).toBeVisible();
  });

  test('should load saved draft', async ({ page }) => {
    // Mock saved draft in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('strategyDraft', JSON.stringify({
        name: 'Saved Draft Strategy',
        walletAddress: '0x123...',
        exchange: 'OKX',
        currentStep: 2
      }));
    });
    
    await page.goto('/strategies');
    await page.click('text=Yeni Strateji Oluştur');
    
    // Check if draft is loaded
    await expect(page.locator('input[name="name"]')).toHaveValue('Saved Draft Strategy');
    await expect(page.locator('text=Kaydedilmiş taslağı devam ettir')).toBeVisible();
  });

  test('should navigate between steps using stepper', async ({ page }) => {
    await page.click('text=Yeni Strateji Oluştur');
    
    // Navigate to step 2
    await page.click('button:has-text("İleri")');
    await expect(page.locator('text=Adım 2/7')).toBeVisible();
    
    // Go back to step 1
    await page.click('button:has-text("Geri")');
    await expect(page.locator('text=Adım 1/7')).toBeVisible();
  });

  test('should show confirmation dialog on cancel', async ({ page }) => {
    await page.click('text=Yeni Strateji Oluştur');
    await page.fill('input[name="name"]', 'Test Strategy');
    
    // Try to cancel
    await page.click('text=İptal');
    
    // Check confirmation dialog
    await expect(page.locator('text=Emin misiniz?')).toBeVisible();
    await expect(page.locator('text=Kaydedilmemiş değişiklikleriniz kaybolacak.')).toBeVisible();
  });

  test('should complete wizard and create strategy', async ({ page }) => {
    // Mock successful strategy creation
    await page.route('**/api/strategies', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'Test Strategy',
          walletAddress: '0x123...',
          exchange: 'OKX',
          copyMode: 'Perpetual',
          isActive: true,
          currentPnL: 0,
          totalPnL: 0,
          tradesCount: 0
        })
      });
    });

    await page.click('text=Yeni Strateji Oluştur');
    
    // Complete all steps (mocked)
    await page.evaluate(() => {
      const wizard = document.querySelector('[data-testid="strategy-wizard"]');
      if (wizard) {
        wizard.dispatchEvent(new CustomEvent('completeWizard'));
      }
    });
    
    // Final submission
    await page.click('button:has-text("Stratejiyi Oluştur")');
    
    await expect(page).toHaveURL('/strategies');
    await expect(page.locator('text=Strateji başarıyla oluşturuldu')).toBeVisible();
  });

  test('should handle API errors during creation', async ({ page }) => {
    // Mock API error
    await page.route('**/api/strategies', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Validation failed' })
      });
    });

    await page.click('text=Yeni Strateji Oluştur');
    
    // Try to complete wizard
    await page.evaluate(() => {
      const wizard = document.querySelector('[data-testid="strategy-wizard"]');
      if (wizard) {
        wizard.dispatchEvent(new CustomEvent('completeWizard'));
      }
    });
    
    await page.click('button:has-text("Stratejiyi Oluştur")');
    
    await expect(page.locator('text=Validation failed')).toBeVisible();
  });

  test('should show progress indicator', async ({ page }) => {
    await page.click('text=Yeni Strateji Oluştur');
    
    // Check progress indicator
    await expect(page.locator('[data-testid="progress-indicator"]')).toBeVisible();
    await expect(page.locator('text=0%')).toBeVisible();
    
    // Navigate through steps and check progress
    await page.fill('input[name="name"]', 'Test Strategy');
    await page.fill('input[name="walletAddress"]', '0x1234567890123456789012345678901234567890');
    await page.selectOption('select[name="exchange"]', 'OKX');
    await page.selectOption('select[name="copyMode"]', 'Perpetual');
    await page.click('button:has-text("İleri")');
    
    await expect(page.locator('text=14%')).toBeVisible(); // 1/7 steps
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.click('text=Yeni Strateji Oluştur');
    
    // Check mobile layout
    await expect(page.locator('text=Strateji Oluşturma Sihirbazı')).toBeVisible();
    await expect(page.locator('button:has-text("İleri")')).toBeVisible();
    await expect(page.locator('button:has-text("Geri")')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await page.click('text=Yeni Strateji Oluştur');
    
    // Fill form using keyboard
    await page.fill('input[name="name"]', 'Test Strategy');
    await page.press('input[name="name"]', 'Tab');
    await page.fill('input[name="walletAddress"]', '0x1234567890123456789012345678901234567890');
    await page.press('input[name="walletAddress"]', 'Tab');
    await page.press('select[name="exchange"]', 'ArrowDown');
    await page.press('select[name="exchange"]', 'Enter');
    
    // Proceed with Enter key
    await page.press('button:has-text("İleri")', 'Enter');
    
    await expect(page.locator('text=Adım 2/7')).toBeVisible();
  });

  test('should validate wallet address format', async ({ page }) => {
    await page.click('text=Yeni Strateji Oluştur');
    
    // Try invalid wallet address
    await page.fill('input[name="walletAddress"]', 'invalid-address');
    await page.click('button:has-text("İleri")');
    
    await expect(page.locator('text=Geçersiz cüzdan adresi')).toBeVisible();
    
    // Try valid wallet address
    await page.fill('input[name="walletAddress"]', '0x1234567890123456789012345678901234567890');
    await page.click('button:has-text("İleri")');
    
    await expect(page.locator('text=Adım 2/7')).toBeVisible();
  });

  test('should show help text for form fields', async ({ page }) => {
    await page.click('text=Yeni Strateji Oluştur');
    
    // Check help text visibility
    await expect(page.locator('text=Strateji için bir isim girin')).toBeVisible();
    await expect(page.locator('text=Kopyalanacak cüzdan adresi')).toBeVisible();
    await expect(page.locator('text=Borsa seçin')).toBeVisible();
  });
});