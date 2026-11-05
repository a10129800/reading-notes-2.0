import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  safeResolve,
  publishWhitelistedBooks,
  saveMasterBook,
  deleteMasterBook,
  saveMasterChapter,
  PUBLIC_CONTENT_DIR,
  PRIVATE_DATA_DIR,
} from '../server/storage';
import { createDefaultChapterSections } from '../src/utils/template';
import { Book } from '../src/types';

describe('Security, Path Traversal & Whitelist Leakage Tests', () => {
  const privateBookId = 'top-secret-private-notes';
  const draftBookId = 'half-baked-draft-ideas';
  const publicBookId = 'verified-public-book';

  afterEach(() => {
    try { deleteMasterBook(privateBookId); } catch {}
    try { deleteMasterBook(draftBookId); } catch {}
    try { deleteMasterBook(publicBookId); } catch {}
    // Clean public dir leftovers
    [privateBookId, draftBookId, publicBookId].forEach(id => {
      const p = path.join(PUBLIC_CONTENT_DIR, id);
      if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
    });
  });

  it('CRITICAL: must throw error and block path traversal attempts', () => {
    const base = path.resolve(process.cwd(), 'server');

    // Attempting traversal up outside base
    expect(() => safeResolve(base, '../package.json')).toThrow(/Path traversal detected/);
    expect(() => safeResolve(base, '../../Windows/System32')).toThrow(/Path traversal detected/);
    expect(() => safeResolve(base, '..', '..', 'secret.txt')).toThrow(/Path traversal detected/);

    // Valid path inside base should succeed
    const valid = safeResolve(base, 'storage.ts');
    expect(valid).toBe(path.join(base, 'storage.ts'));
  });

  it('CRITICAL: safe publish must ONLY publish public books, strictly blocking private and draft notes', () => {
    // 1. Create a PRIVATE book
    const privateBook: Book = {
      id: privateBookId,
      title: '個人機密日記與私人思考',
      author: '我自己',
      publisher: '',
      publishDate: '',
      isbn: '',
      coverImage: '',
      category: '個人日記',
      tags: ['機密', '私人'],
      startDate: '2026-01-01',
      status: 'private', // STRICTLY PRIVATE
      readingStatus: 'reading',
      progress: 50,
      motivation: '不可外流',
      introduction: '絕不能出現在公開網站',
      coreIdea: '絕密想法',
      chapters: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveMasterBook(privateBook);
    saveMasterChapter(privateBookId, {
      id: 'secret-ch-01',
      bookId: privateBookId,
      order: 1,
      title: '極密章節',
      sections: createDefaultChapterSections('極密'),
      quotes: [],
      relatedLinks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. Create a DRAFT book
    const draftBook: Book = {
      id: draftBookId,
      title: '未完成的半成品草稿',
      author: '作者',
      publisher: '',
      publishDate: '',
      isbn: '',
      coverImage: '',
      category: '隨想',
      tags: ['草稿'],
      startDate: '2026-01-01',
      status: 'draft', // DRAFT
      readingStatus: 'unread',
      progress: 5,
      motivation: '',
      introduction: '',
      coreIdea: '',
      chapters: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveMasterBook(draftBook);

    // 3. Create a PUBLIC book
    const publicBook: Book = {
      id: publicBookId,
      title: '合規公開的學術筆記',
      author: '公開學者',
      publisher: '公開出版社',
      publishDate: '2026-01-01',
      isbn: '9780000000001',
      coverImage: '',
      category: '學術研究',
      tags: ['公開知識'],
      startDate: '2026-01-01',
      status: 'public', // PUBLIC
      readingStatus: 'completed',
      progress: 100,
      motivation: '公開分享',
      introduction: '所有人皆可閱讀',
      coreIdea: '共享智慧',
      chapters: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveMasterBook(publicBook);
    saveMasterChapter(publicBookId, {
      id: 'pub-ch-01',
      bookId: publicBookId,
      order: 1,
      title: '第一章：公開導讀',
      sections: createDefaultChapterSections('公開導讀'),
      quotes: [],
      relatedLinks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 4. Trigger safe publish pipeline
    const publishResult = publishWhitelistedBooks();

    // 5. Assertions on published content
    const manifestPath = path.join(PUBLIC_CONTENT_DIR, 'books-manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const manifestBookIds = manifest.books.map((b: any) => b.id);

    // PUBLIC book MUST exist in manifest
    expect(manifestBookIds).toContain(publicBookId);
    expect(fs.existsSync(path.join(PUBLIC_CONTENT_DIR, publicBookId, 'book.json'))).toBe(true);
    expect(fs.existsSync(path.join(PUBLIC_CONTENT_DIR, publicBookId, 'pub-ch-01.json'))).toBe(true);

    // PRIVATE book MUST NOT exist in manifest or public directory!
    expect(manifestBookIds).not.toContain(privateBookId);
    expect(fs.existsSync(path.join(PUBLIC_CONTENT_DIR, privateBookId))).toBe(false);

    // DRAFT book MUST NOT exist in manifest or public directory!
    expect(manifestBookIds).not.toContain(draftBookId);
    expect(fs.existsSync(path.join(PUBLIC_CONTENT_DIR, draftBookId))).toBe(false);

    // 6. Demotion Test: Switch the public book to 'private', then re-publish!
    publicBook.status = 'private';
    saveMasterBook(publicBook);

    const demotePublishResult = publishWhitelistedBooks();
    expect(demotePublishResult.removedCount).toBeGreaterThanOrEqual(1);

    // Verify it is completely erased from PUBLIC_CONTENT_DIR
    expect(fs.existsSync(path.join(PUBLIC_CONTENT_DIR, publicBookId))).toBe(false);

    const updatedManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const updatedIds = updatedManifest.books.map((b: any) => b.id);
    expect(updatedIds).not.toContain(publicBookId);
  });
});
