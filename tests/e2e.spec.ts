import { test, expect } from '@playwright/test';

test.describe('Reading Notes 2.0 - End-to-End Browser Acceptance Suite', () => {

  test('1. Home Dashboard loads real data, branding, and statistics', async ({ page }) => {
    await page.goto('/');

    // Check brand
    await expect(page.locator('text=Reading Notes').first()).toBeVisible();
    await expect(page.locator('text=2.0').first()).toBeVisible();

    // Check Hero
    await expect(page.locator('h1')).toContainText('深入閱讀');

    // Check dashboard statistic cards
    await expect(page.locator('text=公開館藏')).toBeVisible();
    await expect(page.locator('text=精讀章節')).toBeVisible();
    await expect(page.locator('text=思想金句萃選')).toBeVisible();
  });

  test('2. Dark mode toggle and responsive theme controls work properly', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');

    // Click theme toggle button
    const themeBtn = page.locator('button[title*="模式"]').first();
    await themeBtn.click();
    await page.waitForTimeout(300);

    const hasDark = await html.evaluate(el => el.classList.contains('dark'));
    // Toggle again
    await themeBtn.click();
    await page.waitForTimeout(300);

    const toggledAgain = await html.evaluate(el => el.classList.contains('dark'));
    expect(toggledAgain).toBe(!hasDark);
  });

  test('3. Books catalog, category filters, and detail page navigation', async ({ page }) => {
    await page.goto('/#/books');

    // Check page header
    await expect(page.locator('h1')).toContainText('書籍館藏總覽');

    // Verify sample book card exists
    const bookTitle = page.locator('text=卓有成效的管理者').first();
    await expect(bookTitle).toBeVisible();

    // Click to navigate to book detail
    await bookTitle.click();
    await expect(page).toHaveURL(/.*#\/books\/the-effective-executive/);

    // Verify detail page elements
    await expect(page.locator('text=全書核心思想')).toBeVisible();
    await expect(page.locator('text=原書章節目錄與 8 步筆記')).toBeVisible();
    await expect(page.locator('text=第一章：卓有成效是可以學會的').first()).toBeVisible();
    await expect(page.locator('text=第二章：掌握自己的時間').first()).toBeVisible();
  });

  test('4. Chapter reader 3-column layout, font size adjustment, and 8-section notes', async ({ page }) => {
    await page.goto('/#/books/the-effective-executive/chapter-01');

    // Check chapter title
    await expect(page.locator('h1')).toContainText('第一章：卓有成效是可以學會的');

    // Check 3-column elements
    await expect(page.locator('text=原書目錄結構')).toBeVisible();
    await expect(page.locator('text=本章 8 步筆記導航')).toBeVisible();

    // Check standard 8 sections in main body
    await expect(page.locator('text=章節導讀').first()).toBeVisible();
    await expect(page.locator('text=核心摘要').first()).toBeVisible();
    await expect(page.locator('text=專業知識與定義').first()).toBeVisible();
    await expect(page.locator('text=白話解釋').first()).toBeVisible();
    await expect(page.locator('text=案例分析').first()).toBeVisible();
    await expect(page.locator('text=重點整理').first()).toBeVisible();
    await expect(page.locator('text=個人心得').first()).toBeVisible();
    await expect(page.locator('text=本章總結與收穫').first()).toBeVisible();

    // Check font size adjustment
    const fontLargeBtn = page.locator('button[title="特大字級"]');
    await expect(fontLargeBtn).toBeVisible();
    await fontLargeBtn.click();
    await page.waitForTimeout(200);
  });

  test('5. Full-text search across books, definitions, and personal reflections', async ({ page }) => {
    await page.goto('/#/search');

    // Search for "時間"
    const searchInput = page.locator('input[placeholder*="輸入關鍵詞"]');
    await searchInput.fill('時間管理');
    await page.locator('button[type="submit"]').click();

    await page.waitForTimeout(600);
    // Should show results matching time management
    await expect(page.locator('text=相符筆記段落')).toBeVisible();
  });

  test('6. Local Manager Studio: dashboard, modal dialogs, and publishing preview', async ({ page }) => {
    await page.goto('/#/manager');

    // Check title
    await expect(page.locator('h1')).toContainText('本機閱讀管理工作台');

    // Check new book button
    const addBookBtn = page.locator('button:has-text("新增書籍")');
    await expect(addBookBtn).toBeVisible();
    await addBookBtn.click();

    // Modal dialog opens
    await expect(page.locator('text=書籍 ID 代號')).toBeVisible();
    await page.locator('button:has-text("取消")').click();

    // Check publish page link
    await page.goto('/#/manager/publish');
    await expect(page.locator('h1')).toContainText('公開發布安全審核流水線');
    await expect(page.locator('text=將公開輸出')).toBeVisible();
  });

  test('7. Local Manager Studio: book creation, chapter authoring, and 8-step notes editing', async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());

    await page.goto('/#/manager');

    // Open add book modal
    const addBookBtn = page.locator('button:has-text("新增書籍")');
    await addBookBtn.click();

    // Fill new book details
    await page.locator('input[placeholder="thinking-fast-and-slow"]').fill('e2e-book-test');
    await page.locator('input[placeholder="快思慢想"]').fill('E2E 自動化測試專用書籍');
    await page.locator('input[placeholder="丹尼爾·康納曼"]').fill('Antigravity 驗收員');

    // Click submit
    await page.locator('button:has-text("確認新增書籍")').click();
    await page.waitForTimeout(800);

    // Verify book appears on dashboard
    await expect(page.locator('text=E2E 自動化測試專用書籍')).toBeVisible();

    // Navigate to edit book
    const editBookLink = page.locator('a[href="#/manager/books/e2e-book-test"]').first();
    await editBookLink.click();
    await page.waitForTimeout(600);

    await expect(page.locator('h1')).toContainText('編輯書籍');

    // Add chapter
    const addChBtn = page.locator('button:has-text("新增章節")');
    await addChBtn.click();

    await page.locator('input[placeholder="chapter-01"]').fill('ch-01');
    await page.locator('input[placeholder="第三章：我能貢獻什麼？"]').fill('第一章：全自動驗收測試');
    await page.locator('button:has-text("確認建立章節")').click();
    await page.waitForTimeout(800);

    // Click "編輯 8 步筆記"
    const editNotesBtn = page.locator('a:has-text("編輯 8 步筆記")').first();
    await editNotesBtn.click();
    await page.waitForTimeout(800);

    await expect(page).toHaveURL(/.*#\/manager\/books\/e2e-book-test\/chapters\/ch-01/);
    await expect(page.locator('h1')).toContainText('編輯 8 步筆記');

    // Verify 8 tabs are accessible
    await expect(page.locator('button:has-text("01. 導讀")')).toBeVisible();
    await expect(page.locator('button:has-text("03. 專業知識")')).toBeVisible();
    await expect(page.locator('button:has-text("07. 個人心得")')).toBeVisible();
    await expect(page.locator('button:has-text("08. 本章總結")')).toBeVisible();

    // Save chapter notes
    const saveBtn = page.locator('button:has-text("儲存章節筆記")');
    await saveBtn.click();
    await page.waitForTimeout(800);

    // Clean up test book
    await page.goto('/#/manager');
    await page.waitForTimeout(600);

    // Delete test book
    const deleteBtn = page.locator('div:has(h3:has-text("E2E 自動化測試專用書籍"))').locator('button[title="刪除此書籍"]').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(800);
    }
  });

  test('8. Backup and Restore management page loads and lists snapshots safely', async ({ page }) => {
    await page.goto('/#/manager/backups');

    await expect(page.locator('h1')).toContainText('完整本機資料備份與還原');
    await expect(page.locator('text=本機歷史備份檔案清單')).toBeVisible();
    await expect(page.locator('button:has-text("建立新備份")')).toBeVisible();
  });

});

