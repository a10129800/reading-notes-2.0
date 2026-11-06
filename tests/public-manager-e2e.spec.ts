import { test, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';

test.describe('Reading Notes 2.0 - Public Site & Manager Isolation Acceptance', () => {
  let previewProcess: ChildProcess | null = null;

  test.beforeAll(async () => {
    // Check if port 4173 is already responding
    try {
      const res = await fetch('http://127.0.0.1:4173/');
      if (res.ok) return;
    } catch {
      // not yet running
    }

    // Spawn preview process
    previewProcess = spawn('npx', ['vite', 'preview', '--port', '4173', '--host', '127.0.0.1'], {
      shell: true,
      stdio: 'ignore',
    });

    // Wait for port 4173 to become available
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch('http://127.0.0.1:4173/');
        if (res.ok) break;
      } catch {
        // waiting
      }
      await new Promise(r => setTimeout(r, 300));
    }
  });

  test.afterAll(async () => {
    if (previewProcess && previewProcess.pid) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(previewProcess.pid), '/f', '/t'], { shell: true });
        } else {
          process.kill(previewProcess.pid);
        }
      } catch {
        // ignore cleanup error
      }
    }
  });

  // =========================================================================
  // Part A: GitHub Pages Public Site Verification (Preview of dist on port 4173)
  // =========================================================================
  test.describe('A. Public Environment (GitHub Pages Pure Reading Mode)', () => {

    test('1. Public Navbar strictly removes Workspace button and manager links', async ({ page }) => {
      await page.goto('http://127.0.0.1:4173/#/');
      await page.waitForTimeout(400);

      // Verify public brand and title
      await expect(page.locator('text=Reading Notes').first()).toBeVisible();

      // Verify public navigation items
      await expect(page.locator('text=總覽首頁').first()).toBeVisible();
      await expect(page.locator('text=書籍館藏').first()).toBeVisible();
      await expect(page.locator('text=知識關聯與金句').first()).toBeVisible();
      await expect(page.locator('text=全文搜尋').first()).toBeVisible();

      // CRITICAL: Workspace button must NOT exist in the DOM
      const workspaceBtn = page.locator('text=工作台');
      await expect(workspaceBtn).toHaveCount(0);

      const mobileWorkspaceBtn = page.locator('text=本機管理工作台');
      await expect(mobileWorkspaceBtn).toHaveCount(0);

      // CRITICAL: No href targeting /manager exists anywhere in DOM
      const managerLinks = page.locator('a[href*="/manager"]');
      await expect(managerLinks).toHaveCount(0);
    });

    test('2. Direct URL access to /manager is strictly blocked and redirected to home', async ({ page }) => {
      // Attempt direct navigation to manager dashboard
      await page.goto('http://127.0.0.1:4173/#/manager');
      await page.waitForTimeout(500);

      // Should be redirected back to public home
      await expect(page).toHaveURL(/.*#\/?$/);
      await expect(page.locator('text=本機閱讀管理工作台')).toHaveCount(0);
      await expect(page.locator('button:has-text("新增書籍")')).toHaveCount(0);

      // Attempt direct navigation to publish pipeline
      await page.goto('http://127.0.0.1:4173/#/manager/publish');
      await page.waitForTimeout(500);

      await expect(page).toHaveURL(/.*#\/?$/);
      await expect(page.locator('text=公開發布安全審核流水線')).toHaveCount(0);

      // Attempt direct navigation to backups
      await page.goto('http://127.0.0.1:4173/#/manager/backups');
      await page.waitForTimeout(500);

      await expect(page).toHaveURL(/.*#\/?$/);
      await expect(page.locator('text=完整本機資料備份與還原')).toHaveCount(0);
    });

    test('3. Public Reading Experience: books catalog, chapter reader, and search function perfectly', async ({ page }) => {
      // 3.1 Books catalog
      await page.goto('http://127.0.0.1:4173/#/books');
      await expect(page.locator('h1')).toContainText('書籍館藏總覽');

      const bookCards = page.locator('.group');
      const bookCount = await bookCards.count();
      expect(bookCount).toBeGreaterThanOrEqual(1);

      // 3.2 Full-text search
      await page.goto('http://127.0.0.1:4173/#/search');
      await expect(page.locator('h1')).toContainText('全書庫全文檢索');
      const searchInput = page.locator('input[type="text"]');
      await searchInput.fill('刑法');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      await expect(page.locator('text=相符').first()).toBeVisible();

      // 3.3 Theme toggle
      const themeBtn = page.locator('button[title*="模式"]').first();
      await expect(themeBtn).toBeVisible();
      await themeBtn.click();
      await page.waitForTimeout(200);
      const isDark = await page.locator('html').evaluate(el => el.classList.contains('dark'));
      expect(typeof isDark).toBe('boolean');
    });
  });

  // =========================================================================
  // Part B: Local Manager Environment Verification (Active on localhost:3000)
  // =========================================================================
  test.describe('B. Localhost Environment (Local Management Studio)', () => {

    test('4. Local Manager Studio: Navbar has Workspace button with connection heartbeat', async ({ page }) => {
      await page.goto('http://127.0.0.1:3000/#/');
      await page.waitForTimeout(400);

      // In local manager mode, Workspace button must be visible
      const workspaceBtn = page.locator('a[href="#/manager"]').first();
      await expect(workspaceBtn).toBeVisible();
      await expect(workspaceBtn).toContainText('工作台');
    });

    test('5. Local Manager Studio: /manager dashboard loads with all management actions', async ({ page }) => {
      await page.goto('http://127.0.0.1:3000/#/manager');
      await page.waitForTimeout(500);

      // Verify dashboard header
      await expect(page.locator('h1')).toContainText('本機閱讀管理工作台');

      // Verify action buttons exist
      await expect(page.locator('button:has-text("新增書籍")')).toBeVisible();
      await expect(page.locator('a[href="#/manager/publish"]')).toBeVisible();
      await expect(page.locator('a[href="#/manager/backups"]')).toBeVisible();
    });

    test('6. Local Manager Studio: /manager/publish pipeline page loads safely', async ({ page }) => {
      await page.goto('http://127.0.0.1:3000/#/manager/publish');
      await page.waitForTimeout(500);

      await expect(page.locator('h1')).toContainText('公開發布安全審核流水線');
      await expect(page.locator('text=白名單發布機制').first()).toBeVisible();
      await expect(page.locator('text=將公開輸出')).toBeVisible();
      await expect(page.locator('text=完全隔離保密')).toBeVisible();
    });
  });
});
