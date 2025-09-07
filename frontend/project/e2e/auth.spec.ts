import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Testler öncesi temizlik
  await page.goto('/');
});

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await expect(page).toHaveTitle(/Zenith Trader/);
    await expect(page.locator('h2')).toContainText('Welcome back, trader');
    await expect(page.locator('h2')).toContainText('Sign in');
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Geçerli bir e‑posta girin')).toBeVisible();
    await expect(page.locator('text=Şifre en az 6 karakter olmalı')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.text-red-800')).toBeVisible();
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    // Mock login response
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-token',
          user: { id: 1, email: 'test@example.com', name: 'Test User' }
        })
      });
    });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should show Google OAuth option', async ({ page }) => {
    await expect(page.locator('text=Google ile Giriş Yap')).toBeVisible();
  });
});

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token');
    });
    
    // Mock dashboard data
    await page.route('**/api/dashboard/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalPnl24h: 1250.50,
          totalPnl24hPercentage: 5.2,
          activeStrategiesCount: 3,
          totalStrategiesCount: 5,
          totalTrades24h: 12,
          recentTrades: []
        })
      });
    });

    await page.goto('/dashboard');
  });

  test('should display dashboard metrics', async ({ page }) => {
    await expect(page.locator('text=Toplam P&L (24s)')).toBeVisible();
    await expect(page.locator('text=Aktif Stratejiler')).toBeVisible();
    await expect(page.locator('text=24s İşlem')).toBeVisible();
  });

  test('should navigate to strategies page', async ({ page }) => {
    await page.click('text=Stratejiler');
    await expect(page).toHaveURL('/strategies');
    await expect(page.locator('h1')).toContainText('Stratejiler');
  });

  test('should navigate to dashboard from sidebar', async ({ page }) => {
    await page.click('[data-testid="sidebar-dashboard"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show mobile menu on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-sidebar"]')).toBeVisible();
  });
});

test.describe('Strategy Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token');
    });
  });

  test('should display strategies list', async ({ page }) => {
    // Mock strategies data
    await page.route('**/api/strategies', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            name: 'BTC Long Strategy',
            walletAddress: '0x123...',
            exchange: 'OKX',
            copyMode: 'Perpetual',
            isActive: true,
            currentPnL: 500.25,
            totalPnL: 1250.50,
            tradesCount: 25,
            leverage: 10,
            stopLoss: 5
          }
        ])
      });
    });

    await page.goto('/strategies');
    await expect(page.locator('text=BTC Long Strategy')).toBeVisible();
    await expect(page.locator('text=OKX')).toBeVisible();
    await expect(page.locator('text=Perpetual')).toBeVisible();
  });

  test('should open strategy creation wizard', async ({ page }) => {
    await page.goto('/strategies');
    await page.click('text=Yeni Strateji Oluştur');
    await expect(page.locator('text=Strateji Oluşturma Sihirbazı')).toBeVisible();
  });

  test('should show strategy details', async ({ page }) => {
    // Mock strategy data
    await page.route('**/api/strategies/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'BTC Long Strategy',
          walletAddress: '0x123...',
          exchange: 'OKX',
          copyMode: 'Perpetual',
          isActive: true,
          currentPnL: 500.25,
          totalPnL: 1250.50,
          tradesCount: 25,
          leverage: 10,
          stopLoss: 5,
          dailyLimit: 1000,
          allowedTokens: ['BTC', 'ETH']
        })
      });
    });

    await page.goto('/strategies/1');
    await expect(page.locator('text=BTC Long Strategy')).toBeVisible();
    await expect(page.locator('text=Kaldıraç: 10x')).toBeVisible();
    await expect(page.locator('text=Stop Loss: 5%')).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should adapt to mobile screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check mobile layout
    await expect(page.locator('h2')).toContainText('Welcome back, trader');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should adapt to tablet screens', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // Check tablet layout
    await expect(page.locator('h2')).toContainText('Welcome back, trader');
  });

  test('should handle desktop layout', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    // Check desktop layout
    await expect(page.locator('h2')).toContainText('Welcome back, trader');
  });
});

test.describe('Error Handling', () => {
  test('should show 404 page for invalid routes', async ({ page }) => {
    await page.goto('/invalid-route');
    await expect(page.locator('text=404')).toBeVisible();
    await expect(page.locator('text=Page not found')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/dashboard/summary', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token');
    });

    await page.goto('/dashboard');
    await expect(page.locator('.text-red-600')).toBeVisible();
  });

  test('should show network error message', async ({ page }) => {
    // Mock network error
    await page.route('**/api/dashboard/summary', async (route) => {
      await route.abort('failed');
    });

    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token');
    });

    await page.goto('/dashboard');
    await expect(page.locator('text=Network error')).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load dashboard within acceptable time', async ({ page }) => {
    // Mock authentication and data
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token');
    });

    await page.route('**/api/dashboard/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalPnl24h: 1250.50,
          totalPnl24hPercentage: 5.2,
          activeStrategiesCount: 3,
          totalStrategiesCount: 5,
          totalTrades24h: 12,
          recentTrades: []
        })
      });
    });

    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForSelector('h1');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000); // 3 seconds threshold
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    // Mock large strategies dataset
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token');
    });

    await page.route('**/api/strategies', async (route) => {
      const strategies = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Strategy ${i + 1}`,
        walletAddress: `0x${Math.random().toString(16).substr(2, 8)}...`,
        exchange: 'OKX',
        copyMode: 'Perpetual',
        isActive: i % 2 === 0,
        currentPnL: Math.random() * 1000,
        totalPnL: Math.random() * 5000,
        tradesCount: Math.floor(Math.random() * 100),
        leverage: Math.floor(Math.random() * 20) + 1,
        stopLoss: Math.floor(Math.random() * 10) + 1
      }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(strategies)
      });
    });

    await page.goto('/strategies');
    await page.waitForSelector('text=Strategy 1');
    
    // Check if page loads and responds
    await expect(page.locator('text=Strategy 1')).toBeVisible();
    await expect(page.locator('text=Strategy 100')).toBeVisible();
  });
});