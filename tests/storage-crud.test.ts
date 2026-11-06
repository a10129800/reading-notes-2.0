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
  createBackup,
  restoreBackup,
  PRIVATE_DATA_DIR,
} from '../server/storage';
import { createDefaultChapterSections } from '../src/utils/template';
import { Book, ChapterDetail } from '../src/types';

describe('Storage & CRUD Operations', () => {
  const testBookId = 'unit-test-book-01';

  beforeAll(() => {
    initPrivateStorage();
  });

  afterEach(() => {
    // Clean up test book if exists
    try {
      deleteMasterBook(testBookId);
    } catch {
      // Ignore
    }
  });

  it('should create and retrieve a book with metadata', () => {
    const book: Book = {
      id: testBookId,
      title: '單元測試書籍',
      author: '測試作者',
      publisher: '測試出版社',
      publishDate: '2026-01-01',
      isbn: '9781234567890',
      coverImage: '',
      category: '電腦科學',
      tags: ['測試', '架構'],
      startDate: '2026-02-01',
      status: 'private',
      readingStatus: 'reading',
      progress: 25,
      motivation: '測試研讀動機',
      introduction: '測試簡介',
      coreIdea: '這是測試核心思想',
      chapters: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = saveMasterBook(book);
    expect(saved.id).toBe(testBookId);
    expect(saved.title).toBe('單元測試書籍');

    const fetched = getMasterBook(testBookId);
    expect(fetched).not.toBeNull();
    expect(fetched?.author).toBe('測試作者');
    expect(fetched?.status).toBe('private');
    expect(fetched?.progress).toBe(25);
  });

  it('should update an existing book', () => {
    const initialBook: Book = {
      id: testBookId,
      title: '原始書名',
      author: '原始作者',
      publisher: '',
      publishDate: '',
      isbn: '',
      coverImage: '',
      category: '心理學',
      tags: [],
      startDate: '2026-01-01',
      status: 'draft',
      readingStatus: 'unread',
      progress: 0,
      motivation: '',
      introduction: '',
      coreIdea: '',
      chapters: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveMasterBook(initialBook);

    // Update
    const updatedBook = {
      ...initialBook,
      title: '已更新之書名',
      progress: 60,
      readingStatus: 'reading' as const,
    };
    saveMasterBook(updatedBook);

    const fetched = getMasterBook(testBookId);
    expect(fetched?.title).toBe('已更新之書名');
    expect(fetched?.progress).toBe(60);
    expect(fetched?.readingStatus).toBe('reading');
  });

  it('should create, retrieve, and delete chapters with 8-section template', () => {
    const book: Book = {
      id: testBookId,
      title: '章節測試書',
      author: '作者',
      publisher: '',
      publishDate: '',
      isbn: '',
      coverImage: '',
      category: '哲學',
      tags: [],
      startDate: '2026-01-01',
      status: 'draft',
      readingStatus: 'reading',
      progress: 10,
      motivation: '',
      introduction: '',
      coreIdea: '',
      chapters: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveMasterBook(book);

    const defaultSections = createDefaultChapterSections('第一章：測試篇章');
    const chapter: ChapterDetail = {
      id: 'ch-01',
      bookId: testBookId,
      order: 1,
      title: '第一章：測試篇章',
      subtitle: '副標題',
      completed: true,
      readingTimeMinutes: 15,
      sections: defaultSections,
      quotes: [
        { id: 'q-1', quote: '測試金句', page: 'p.10' }
      ],
      relatedLinks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveMasterChapter(testBookId, chapter);

    const fetchedChapter = getMasterChapter(testBookId, 'ch-01');
    expect(fetchedChapter).not.toBeNull();
    expect(fetchedChapter?.title).toBe('第一章：測試篇章');
    expect(fetchedChapter?.sections.introduction.overview).toContain('本章重點探討');
    expect(fetchedChapter?.quotes).toHaveLength(1);
    expect(fetchedChapter?.quotes[0].quote).toBe('測試金句');

    // Also verify human-readable Markdown file was written alongside JSON
    const mdPath = path.join(PRIVATE_DATA_DIR, 'books', testBookId, 'ch-01.md');
    expect(fs.existsSync(mdPath)).toBe(true);
    const mdContent = fs.readFileSync(mdPath, 'utf-8');
    expect(mdContent).toContain('## 01. 章節導讀');
    expect(mdContent).toContain('## 05. 案例分析');
    expect(mdContent).toContain('## 08. 本章總結');

    // Delete chapter
    const deleted = deleteMasterChapter(testBookId, 'ch-01');
    expect(deleted).toBe(true);
    expect(getMasterChapter(testBookId, 'ch-01')).toBeNull();
  });

  it('should support chapter reordering and preserve original sequence', () => {
    const book: Book = {
      id: testBookId,
      title: '排序測試書',
      author: '作者',
      publisher: '',
      publishDate: '',
      isbn: '',
      coverImage: '',
      category: '管理',
      tags: [],
      startDate: '2026-01-01',
      status: 'private',
      readingStatus: 'reading',
      progress: 0,
      motivation: '',
      introduction: '',
      coreIdea: '',
      chapters: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveMasterBook(book);

    // Save three chapters
    saveMasterChapter(testBookId, {
      id: 'ch-a',
      bookId: testBookId,
      order: 1,
      title: '篇章 A',
      sections: createDefaultChapterSections('A'),
      quotes: [],
      relatedLinks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    saveMasterChapter(testBookId, {
      id: 'ch-b',
      bookId: testBookId,
      order: 2,
      title: '篇章 B',
      sections: createDefaultChapterSections('B'),
      quotes: [],
      relatedLinks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    saveMasterChapter(testBookId, {
      id: 'ch-c',
      bookId: testBookId,
      order: 3,
      title: '篇章 C',
      sections: createDefaultChapterSections('C'),
      quotes: [],
      relatedLinks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Reorder: C, A, B
    const updated = reorderMasterChapters(testBookId, ['ch-c', 'ch-a', 'ch-b']);
    expect(updated).not.toBeNull();
    expect(updated?.chapters[0].id).toBe('ch-c');
    expect(updated?.chapters[0].order).toBe(1);
    expect(updated?.chapters[1].id).toBe('ch-a');
    expect(updated?.chapters[1].order).toBe(2);
    expect(updated?.chapters[2].id).toBe('ch-b');
    expect(updated?.chapters[2].order).toBe(3);
  });

  it('should successfully create and restore backup without data loss', () => {
    // 1. Prepare dedicated test book with chapters for backup validation
    const backupBookId = 'backup-crud-test-book';
    const backupBook: Book = {
      id: backupBookId,
      title: '備份還原測試專用書籍',
      author: '備份工程師',
      publisher: '測試出版社',
      publishDate: '2026-01-01',
      isbn: '978-0-99-887766-5',
      coverImage: '',
      category: '系統架構',
      tags: ['備份', '還原'],
      startDate: '2026-01-01',
      status: 'private',
      readingStatus: 'reading',
      progress: 60,
      motivation: '驗證無損備份與還原',
      introduction: '書籍詳細說明',
      coreIdea: '資料完整性保障',
      chapters: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveMasterBook(backupBook);

    saveMasterChapter(backupBookId, {
      id: 'backup-ch-1',
      bookId: backupBookId,
      order: 1,
      title: '備份第一章',
      sections: createDefaultChapterSections('備份章節內容'),
      quotes: [],
      relatedLinks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    try {
      // 2. Execute backup
      const backupInfo = createBackup();
      expect(backupInfo.filename).toContain('backup-reading-notes-');
      expect(backupInfo.sizeBytes).toBeGreaterThan(0);

      // 3. Delete book to simulate data recovery scenario
      deleteMasterBook(backupBookId);
      expect(getMasterBook(backupBookId)).toBeNull();

      // 4. Execute restore
      const restoreResult = restoreBackup(backupInfo.filename);
      expect(restoreResult.restoredBooks).toBeGreaterThanOrEqual(1);

      // 5. Verify restored data integrity
      const restoredBook = getMasterBook(backupBookId);
      expect(restoredBook).not.toBeNull();
      expect(restoredBook?.title).toBe('備份還原測試專用書籍');
      expect(restoredBook?.chapters.length).toBe(1);

      const restoredChapter = getMasterChapter(backupBookId, 'backup-ch-1');
      expect(restoredChapter).not.toBeNull();
      expect(restoredChapter?.title).toBe('備份第一章');
    } finally {
      deleteMasterBook(backupBookId);
    }
  });
});
