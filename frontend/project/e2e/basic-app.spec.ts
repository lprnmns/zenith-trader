import { test, expect } from '@playwright/test';

test.describe('Basic Application Tests', () => {
  test('should load application successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Zenith Trader/);
  });

  test('should display login form', async ({ page }) => {
    await page.goto('/');
    
    // Check if email input exists
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('placeholder', 'Email address');
    
    // Check if password input exists
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('placeholder', 'Password');
    
    // Check if submit button exists
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveText('Giriş Yap');
  });

  test('should show validation messages for empty form', async ({ page }) => {
    await page.goto('/');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Wait for validation messages to appear
    await page.waitForTimeout(1000);
    
    // Check if any validation error is visible
    const errorMessages = page.locator('.text-red-400');
    const errorCount = await errorMessages.count();
    
    // We expect at least one validation error
    expect(errorCount).toBeGreaterThan(0);
  });

  test('should accept email input', async ({ page }) => {
    await page.goto('/');
    
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('should accept password input', async ({ page }) => {
    await page.goto('/');
    
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('password123');
    await expect(passwordInput).toHaveValue('password123');
  });

  test('should show Google login option', async ({ page }) => {
    await page.goto('/');
    
    // Check if Google login button exists
    const googleButton = page.locator('text=Google ile Giriş Yap');
    await expect(googleButton).toBeVisible();
  });

  test('should show register link', async ({ page }) => {
    await page.goto('/');
    
    // Check if register link exists
    const registerLink = page.locator('a[href="/register"]');
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveText('Sign up');
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check if form is still visible on mobile
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // Check if form is still visible on tablet
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('should handle form submission with invalid data', async ({ page }) => {
    await page.goto('/');
    
    // Fill with invalid data
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', '123');
    await page.click('button[type="submit"]');
    
    // Wait for potential error handling
    await page.waitForTimeout(2000);
    
    // Check that we're still on login page (no redirect)
    await expect(page).toHaveURL('/');
  });
});

test.describe('Navigation Tests', () => {
  test('should navigate to register page', async ({ page }) => {
    await page.goto('/');
    
    // Click register link
    await page.click('a[href="/register"]');
    
    // Check if URL changed
    await expect(page).toHaveURL('/register');
  });

  test('should handle invalid routes', async ({ page }) => {
    await page.goto('/invalid-route');
    
    // Check if page loads (even if it shows error)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Performance Tests', () => {
  test('should load login page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000); // 5 seconds threshold
  });

  test('should render form quickly', async ({ page }) => {
    await page.goto('/');
    
    const startTime = Date.now();
    await page.waitForSelector('input[type="email"]');
    const renderTime = Date.now() - startTime;
    
    expect(renderTime).toBeLessThan(3000); // 3 seconds threshold
  });
});

test.describe('Accessibility Tests', () => {
  test('should have proper form labels', async ({ page }) => {
    await page.goto('/');
    
    // Check if inputs have proper attributes
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('type', 'email');
    
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should have clickable submit button', async ({ page }) => {
    await page.goto('/');
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled();
  });

  test('should have visible links', async ({ page }) => {
    await page.goto('/');
    
    const registerLink = page.locator('a[href="/register"]');
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveAttribute('href', '/register');
  });
});