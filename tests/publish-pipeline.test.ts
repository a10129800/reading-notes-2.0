import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  verifyPublicBooksSecurity,
  checkRemoteSafety,
  stagePublicBooksOnly,
  runGit,
} from '../server/gitPublisher';
import {
  saveMasterBook,
  publishWhitelistedBooks,
  PUBLIC_CONTENT_DIR,
  PRIVATE_DATA_DIR,
} from '../server/storage';
import { Book } from '../src/types';

describe('Publish Pipeline Security & Git Flow Tests', () => {
  const testPrivateBookId = 'test-pipeline-private-book';
  const testDraftBookId = 'test-pipeline-draft-book';
  const testPublicBookId = 'test-pipeline-public-book';

  beforeEach(() => {
    // Setup clean environment
  });

  afterEach(() => {
    // Clean test books from private storage
    const booksDir = path.join(PRIVATE_DATA_DIR, 'books');
    [testPrivateBookId, testDraftBookId, testPublicBookId].forEach(id => {
      const p = path.join(booksDir, id);
      if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
      const pubP = path.join(PUBLIC_CONTENT_DIR, id);
      if (fs.existsSync(pubP)) fs.rmSync(pubP, { recursive: true, force: true });
    });
  });

  it('1. verifyPublicBooksSecurity passes when all manifest and book.json files are public', () => {
    const res = verifyPublicBooksSecurity();
    expect(res.valid).toBe(true);
  });

  it('2. verifyPublicBooksSecurity strictly catches any non-public book injected into public folder', () => {
    // Temporarily inject a draft folder into public-books
    const fakeDir = path.join(PUBLIC_CONTENT_DIR, 'fake-leaked-draft');
    fs.mkdirSync(fakeDir, { recursive: true });
    fs.writeFileSync(path.join(fakeDir, 'book.json'), JSON.stringify({
      id: 'fake-leaked-draft',
      title: 'Leaked Draft',
      status: 'draft',
    }), 'utf-8');

    try {
      const res = verifyPublicBooksSecurity();
      expect(res.valid).toBe(false);
      expect(res.error).toContain('安全違規');
    } finally {
      fs.rmSync(fakeDir, { recursive: true, force: true });
    }
  });

  it('3. verifyPublicBooksSecurity strictly catches forbidden image formats inside public-books', () => {
    const fakeImg = path.join(PUBLIC_CONTENT_DIR, 'test-public-book', 'raw-scan.jpg');
    fs.writeFileSync(fakeImg, 'fake binary scan data');

    try {
      const res = verifyPublicBooksSecurity();
      expect(res.valid).toBe(false);
      expect(res.error).toContain('原始附件或圖片檔');
    } finally {
      if (fs.existsSync(fakeImg)) fs.unlinkSync(fakeImg);
    }
  });

  it('4. publishWhitelistedBooks purges formerly public book when status changes to private', () => {
    // First save as public
    const book: Book = {
      id: testPublicBookId,
      title: 'Demotion Test Book',
      author: 'Tester',
      publisher: 'Test Publisher',
      publishDate: '2026-01-01',
      isbn: '978-0-00-000000-0',
      category: 'Test',
      status: 'public',
      readingStatus: 'reading',
      progress: 0,
      motivation: '',
      introduction: '',
      coreIdea: '',
      tags: [],
      chapters: [],
      startDate: '2026-01-01',
      coverImage: '',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    saveMasterBook(book);

    // Sync to public
    const res1 = publishWhitelistedBooks();
    expect(res1.publishedBooks).toContain('Demotion Test Book');
    expect(fs.existsSync(path.join(PUBLIC_CONTENT_DIR, testPublicBookId))).toBe(true);

    // Now change to private
    book.status = 'private';
    saveMasterBook(book);

    // Sync again
    const res2 = publishWhitelistedBooks();
    expect(res2.publishedBooks).not.toContain('Demotion Test Book');
    expect(res2.removedCount).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(path.join(PUBLIC_CONTENT_DIR, testPublicBookId))).toBe(false);
  });

  it('5. stagePublicBooksOnly strictly operates only within content/public-books/', async () => {
    const stageRes = await stagePublicBooksOnly();
    for (const f of stageRes.stagedFiles) {
      const normalized = f.replace(/\\/g, '/');
      expect(normalized.startsWith('content/public-books/')).toBe(true);
    }
    // Clean up staged state so automated testing leaves git index clean
    await runGit(['restore', '--staged', 'content/public-books/']);
  });

  it('6. checkRemoteSafety correctly verifies local head against origin/master', async () => {
    const remoteCheck = await checkRemoteSafety();
    // In our verified repository, local is either in sync or ahead (both safe)
    expect(remoteCheck.diverged).toBe(false);
    expect(remoteCheck.remoteAhead).toBe(false);
  });

  it('7. regression: verifies real repository content/public-books/51ml602210 integrity and manifest inclusion', () => {
    const repoPublicDir = path.resolve(process.cwd(), 'content/public-books');
    const book51Dir = path.join(repoPublicDir, '51ml602210');
    expect(fs.existsSync(book51Dir)).toBe(true);

    const bookJsonPath = path.join(book51Dir, 'book.json');
    expect(fs.existsSync(bookJsonPath)).toBe(true);
    const bookData = JSON.parse(fs.readFileSync(bookJsonPath, 'utf-8'));
    expect(bookData.id).toBe('51ml602210');
    expect(bookData.title).toBe('刑法總則（圖說）');
    expect(bookData.status).toBe('public');

    const chapterPath = path.join(book51Dir, 'intro-crime-concept.json');
    expect(fs.existsSync(chapterPath)).toBe(true);
    const chapterData = JSON.parse(fs.readFileSync(chapterPath, 'utf-8'));
    expect(chapterData.id).toBe('intro-crime-concept');
    expect(chapterData.bookId).toBe('51ml602210');

    // Verify manifest in repo lists 51ml602210
    const manifestPath = path.join(repoPublicDir, 'books-manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const found = manifest.books.find((b: any) => b.id === '51ml602210');
    expect(found).toBeDefined();
    expect(found.title).toBe('刑法總則（圖說）');
    expect(found.status).toBe('public');
  });

  it('8. regression: publishWhitelistedBooks operates strictly in sandbox and NEVER touches repo content/public-books', () => {
    const repoPublicDir = path.resolve(process.cwd(), 'content/public-books');
    const repoFilesBefore = fs.readdirSync(repoPublicDir);
    const book51Before = fs.readdirSync(path.join(repoPublicDir, '51ml602210'));

    // Execute publish in test sandbox
    const result = publishWhitelistedBooks();
    expect(result).toBeDefined();

    // Verify sandbox public dir has the published content
    expect(fs.existsSync(PUBLIC_CONTENT_DIR)).toBe(true);

    // Verify repository public content has ZERO changes
    const repoFilesAfter = fs.readdirSync(repoPublicDir);
    expect(repoFilesAfter).toEqual(repoFilesBefore);

    const book51After = fs.readdirSync(path.join(repoPublicDir, '51ml602210'));
    expect(book51After).toEqual(book51Before);
  });

  it('9. regression: demotion purge logic functions properly inside sandbox without affecting real repo', () => {
    const demoteBookId = 'test-demote-sandbox-book';
    const sandboxBook: Book = {
      id: demoteBookId,
      title: 'Sandbox Demotion Book',
      author: 'Tester',
      publisher: 'Test Press',
      publishDate: '2026-01-01',
      isbn: '978-0-12-345678-9',
      category: 'Test',
      status: 'public',
      readingStatus: 'reading',
      progress: 50,
      motivation: 'Test',
      introduction: 'Test',
      coreIdea: 'Test',
      tags: ['test'],
      chapters: [],
      startDate: '2026-01-01',
      coverImage: '',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // 1. Save in sandbox private and publish
    saveMasterBook(sandboxBook);
    const res1 = publishWhitelistedBooks();
    expect(res1.publishedBooks).toContain('Sandbox Demotion Book');
    expect(fs.existsSync(path.join(PUBLIC_CONTENT_DIR, demoteBookId))).toBe(true);

    // 2. Demote to private
    sandboxBook.status = 'private';
    saveMasterBook(sandboxBook);
    const res2 = publishWhitelistedBooks();
    expect(res2.removedCount).toBeGreaterThanOrEqual(1);

    // 3. Verify purged from sandbox public
    expect(fs.existsSync(path.join(PUBLIC_CONTENT_DIR, demoteBookId))).toBe(false);

    // 4. Verify repo content/public-books is completely untouched and 51ml602210 remains intact
    const repo51Path = path.resolve(process.cwd(), 'content/public-books/51ml602210/book.json');
    expect(fs.existsSync(repo51Path)).toBe(true);
  });
});
