import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  initPrivateStorage,
  saveMasterBook,
  getMasterBook,
  deleteMasterBook,
  saveMasterChapter,
  getMasterChapter,
  deleteMasterChapter,
  reorderMasterChapters,
  publishWhitelistedBooks,
  createBackup,
  restoreBackup,
  safeResolve,
  PUBLIC_CONTENT_DIR,
  PRIVATE_DATA_DIR,
} from '../server/storage';
import { sanitizeErrorMessage } from '../server/index';
import { createDefaultChapterSections } from '../src/utils/template';
import { Book, ChapterDetail } from '../src/types';

describe('Second Round Security & Quality Audit Test Suite', () => {
  const auditPrefix = 'audit-test-';

  beforeAll(() => {
    initPrivateStorage();
  });

  afterEach(() => {
    // Clean up any test books generated with auditPrefix
    const booksDir = path.join(PRIVATE_DATA_DIR, 'books');
    if (fs.existsSync(booksDir)) {
      const items = fs.readdirSync(booksDir);
      for (const item of items) {
        if (item.startsWith(auditPrefix)) {
          try {
            deleteMasterBook(item);
          } catch {}
        }
      }
    }

    // Clean public directory
    if (fs.existsSync(PUBLIC_CONTENT_DIR)) {
      const pubItems = fs.readdirSync(PUBLIC_CONTENT_DIR);
      for (const item of pubItems) {
        if (item.startsWith(auditPrefix)) {
          try {
            fs.rmSync(path.join(PUBLIC_CONTENT_DIR, item), { recursive: true, force: true });
          } catch {}
        }
      }
    }
  });

  // =========================================================================
  // Section III: Publishing Security & 9-Step Simulation
  // =========================================================================
  describe('Publishing Lifecycle & Demotion Purge (9-Step Simulation)', () => {
    const pubSimBookId = `${auditPrefix}pub-sim-book`;

    it('executes full 9-step simulation: public -> verify -> private -> purge -> draft -> missing status rejection', () => {
      // 1. Create public book and save
      const publicBook: Book = {
        id: pubSimBookId,
        title: '發布安全性驗收專用書籍',
        author: '稽核小組',
        publisher: '測試出版社',
        publishDate: '2026-11-05',
        isbn: '9789999999999',
        coverImage: '',
        category: '安全稽核',
        tags: ['白名單', '安全驗證'],
        startDate: '2026-11-01',
        status: 'public',
        readingStatus: 'reading',
        progress: 80,
        motivation: '驗證發布流水線',
        introduction: '公開閱讀內容測試',
        coreIdea: '白名單機制保證零資料洩漏',
        chapters: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveMasterBook(publicBook);

      saveMasterChapter(pubSimBookId, {
        id: 'ch-01',
        bookId: pubSimBookId,
        order: 1,
        title: '第一章：安全發布驗證',
        sections: createDefaultChapterSections('安全發布驗證'),
        quotes: [],
        relatedLinks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 2. Publish and confirm public site can read
      const pubResult1 = publishWhitelistedBooks();
      expect(pubResult1.publishedBooks).toContain('發布安全性驗收專用書籍');

      const pubBookDir = path.join(PUBLIC_CONTENT_DIR, pubSimBookId);
      expect(fs.existsSync(pubBookDir)).toBe(true);
      expect(fs.existsSync(path.join(pubBookDir, 'book.json'))).toBe(true);
      expect(fs.existsSync(path.join(pubBookDir, 'ch-01.json'))).toBe(true);

      const manifest1 = JSON.parse(fs.readFileSync(path.join(PUBLIC_CONTENT_DIR, 'books-manifest.json'), 'utf-8'));
      expect(manifest1.books.some((b: any) => b.id === pubSimBookId)).toBe(true);

      // 3. Switch public to private
      publicBook.status = 'private';
      saveMasterBook(publicBook);

      // 4. Re-publish
      const pubResult2 = publishWhitelistedBooks();
      expect(pubResult2.removedCount).toBeGreaterThanOrEqual(1);

      // 5. Verify old JSON and directory are COMPLETELY PURGED
      expect(fs.existsSync(pubBookDir)).toBe(false);
      const manifest2 = JSON.parse(fs.readFileSync(path.join(PUBLIC_CONTENT_DIR, 'books-manifest.json'), 'utf-8'));
      expect(manifest2.books.some((b: any) => b.id === pubSimBookId)).toBe(false);

      // 6. Switch private to draft
      publicBook.status = 'draft';
      saveMasterBook(publicBook);

      // 7. Re-publish and verify still cannot be published
      publishWhitelistedBooks();
      expect(fs.existsSync(pubBookDir)).toBe(false);
      const manifest3 = JSON.parse(fs.readFileSync(path.join(PUBLIC_CONTENT_DIR, 'books-manifest.json'), 'utf-8'));
      expect(manifest3.books.some((b: any) => b.id === pubSimBookId)).toBe(false);

      // 8. Create a book missing status field completely
      const missingStatusBookId = `${auditPrefix}no-status-book`;
      const unformattedBook: any = {
        id: missingStatusBookId,
        title: '缺少 status 欄位之異常書籍',
        author: '未知',
        chapters: [],
      };
      // saveMasterBook automatically defaults missing/unknown status to 'draft'
      const savedBook = saveMasterBook(unformattedBook);
      expect(savedBook.status).toBe('draft');

      // 9. Verify publishing rejects it by default
      publishWhitelistedBooks();
      expect(fs.existsSync(path.join(PUBLIC_CONTENT_DIR, missingStatusBookId))).toBe(false);
    });
  });

  // =========================================================================
  // Section IV: CRUD & Data Integrity Tests
  // =========================================================================
  describe('CRUD, Special Characters & Inter-Book Isolation', () => {
    it('handles special Chinese characters, punctuations, and unicode symbols safely', () => {
      const specialBookId = `${auditPrefix}special-chars-book`;
      const specialTitle = '《深度探討：非線性思維——「原著·心得·辨析」【卷一】》（特殊符號：🎵🚀🔑）';
      const specialCoreIdea = '核心論述：【思維模型】不僅是工具，更是認知護城河——正如杜拉克所言：「有效性是一種習慣」。';

      const specialBook: Book = {
        id: specialBookId,
        title: specialTitle,
        author: '李白 & 杜甫 (諸子百家)',
        publisher: '聯經出版·經典人文',
        publishDate: '2026-11-05',
        isbn: '978-957-08-0000-0',
        coverImage: '',
        category: '東方哲學/心智模型',
        tags: ['思想史', '思辨·批判', '非線性', '精讀📚'],
        startDate: '2026-01-01',
        status: 'private',
        readingStatus: 'reading',
        progress: 33,
        motivation: '探索古今哲思與系統思考之接壤處。',
        introduction: '本筆記全面考察先秦諸子在決策學上的應用。',
        coreIdea: specialCoreIdea,
        chapters: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveMasterBook(specialBook);
      const fetched = getMasterBook(specialBookId);

      expect(fetched).not.toBeNull();
      expect(fetched?.title).toBe(specialTitle);
      expect(fetched?.coreIdea).toBe(specialCoreIdea);
      expect(fetched?.tags).toContain('精讀📚');
    });

    it('supports high-volume chapter storage (50 chapters) with order synchronization', () => {
      const volumeBookId = `${auditPrefix}high-volume-book`;
      saveMasterBook({
        id: volumeBookId,
        title: '五十篇巨型章節測試書籍',
        author: '高容量作者',
        publisher: '',
        publishDate: '',
        isbn: '',
        coverImage: '',
        category: '測試',
        tags: [],
        startDate: '2026-01-01',
        status: 'private',
        readingStatus: 'reading',
        progress: 50,
        motivation: '',
        introduction: '',
        coreIdea: '',
        chapters: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const totalChapters = 50;
      for (let i = 1; i <= totalChapters; i++) {
        const chId = `chapter-${String(i).padStart(2, '0')}`;
        saveMasterChapter(volumeBookId, {
          id: chId,
          bookId: volumeBookId,
          order: i,
          title: `第 ${i} 篇：大容量章節測試主題`,
          sections: createDefaultChapterSections(`第 ${i} 篇`),
          quotes: [],
          relatedLinks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      const reloadedBook = getMasterBook(volumeBookId);
      expect(reloadedBook?.chapters).toHaveLength(totalChapters);
      expect(reloadedBook?.chapters[0].title).toBe('第 1 篇：大容量章節測試主題');
      expect(reloadedBook?.chapters[49].title).toBe('第 50 篇：大容量章節測試主題');
      expect(reloadedBook?.chapters[49].order).toBe(50);
    });

    it('guarantees complete data isolation between separate books', () => {
      const bookAId = `${auditPrefix}iso-book-a`;
      const bookBId = `${auditPrefix}iso-book-b`;

      saveMasterBook({
        id: bookAId,
        title: '書籍 A (獨立資料庫)',
        author: '作者 A',
        category: 'A',
        tags: ['TagA'],
        status: 'private',
        readingStatus: 'reading',
        progress: 10,
        motivation: '',
        introduction: '',
        coreIdea: 'A 的核心想法',
        chapters: [],
        publisher: '',
        publishDate: '',
        isbn: '',
        coverImage: '',
        startDate: '2026-01-01',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      saveMasterBook({
        id: bookBId,
        title: '書籍 B (獨立資料庫)',
        author: '作者 B',
        category: 'B',
        tags: ['TagB'],
        status: 'private',
        readingStatus: 'reading',
        progress: 20,
        motivation: '',
        introduction: '',
        coreIdea: 'B 的核心想法',
        chapters: [],
        publisher: '',
        publishDate: '',
        isbn: '',
        coverImage: '',
        startDate: '2026-01-01',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      saveMasterChapter(bookAId, {
        id: 'ch-a1',
        bookId: bookAId,
        order: 1,
        title: 'A 的專屬章節',
        sections: createDefaultChapterSections('A1'),
        quotes: [],
        relatedLinks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      saveMasterChapter(bookBId, {
        id: 'ch-b1',
        bookId: bookBId,
        order: 1,
        title: 'B 的專屬章節',
        sections: createDefaultChapterSections('B1'),
        quotes: [],
        relatedLinks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Delete Book A completely
      deleteMasterBook(bookAId);

      // Verify Book A is gone
      expect(getMasterBook(bookAId)).toBeNull();
      expect(getMasterChapter(bookAId, 'ch-a1')).toBeNull();

      // Verify Book B and its chapter are completely unaffected
      const fetchedB = getMasterBook(bookBId);
      expect(fetchedB).not.toBeNull();
      expect(fetchedB?.title).toBe('書籍 B (獨立資料庫)');
      expect(getMasterChapter(bookBId, 'ch-b1')).not.toBeNull();
    });

    it('rejects corrupted backups and incompatible schema versions', () => {
      const backupsDir = path.join(PRIVATE_DATA_DIR, 'backups');

      // 1. Create a corrupted JSON file
      const corruptedName = `${auditPrefix}corrupted-backup.json`;
      fs.writeFileSync(path.join(backupsDir, corruptedName), '{ broken json : missing brace', 'utf-8');

      expect(() => restoreBackup(corruptedName)).toThrow(/Corrupted backup archive/);

      // 2. Create an incompatible schema version file
      const incompatibleName = `${auditPrefix}incompatible-version.json`;
      fs.writeFileSync(
        path.join(backupsDir, incompatibleName),
        JSON.stringify({ schemaVersion: '9.9.9', books: [] }, null, 2),
        'utf-8'
      );

      expect(() => restoreBackup(incompatibleName)).toThrow(/Incompatible backup schema version/);

      // Clean test backups
      try { fs.unlinkSync(path.join(backupsDir, corruptedName)); } catch {}
      try { fs.unlinkSync(path.join(backupsDir, incompatibleName)); } catch {}
    });

    it('strictly sanitizes and redacts local filesystem paths from error messages', () => {
      const rawError1 = 'ENOENT: no such file at F:\\IDE\\Reading-Notes-Private\\books\\secret\\book.json';
      const redacted1 = sanitizeErrorMessage(rawError1);
      expect(redacted1).not.toContain('F:\\IDE\\Reading-Notes-Private');
      expect(redacted1).toContain('[LOCAL_PATH]');

      const rawError2 = 'Cannot open /Users/alice/private/secret.json';
      const redacted2 = sanitizeErrorMessage(rawError2);
      expect(redacted2).not.toContain('/Users/alice/private');
      expect(redacted2).toContain('[LOCAL_PATH]');
    });
  });
});

