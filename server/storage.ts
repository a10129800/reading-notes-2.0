import fs from 'fs';
import path from 'path';
import { Book, ChapterDetail, PublicBooksManifest, BookStatus } from '../src/types';
import { createDefaultChapterSections, formatChapterToMarkdown } from '../src/utils/template';

// Sibling directory outside public Git repository
const DEFAULT_PRIVATE_DIR = path.resolve(process.cwd(), '../Reading-Notes-Private');
export const PRIVATE_DATA_DIR = process.env.PRIVATE_DATA_DIR || DEFAULT_PRIVATE_DIR;

// Public books destination in the public repository
export const PUBLIC_CONTENT_DIR = path.resolve(process.cwd(), 'content/public-books');

/**
 * Initialize directories if they don't exist
 */
export function initPrivateStorage() {
  const dirs = [
    PRIVATE_DATA_DIR,
    path.join(PRIVATE_DATA_DIR, 'books'),
    path.join(PRIVATE_DATA_DIR, 'drafts'),
    path.join(PRIVATE_DATA_DIR, 'images'),
    path.join(PRIVATE_DATA_DIR, 'attachments'),
    path.join(PRIVATE_DATA_DIR, 'backups'),
    PUBLIC_CONTENT_DIR,
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Seed sample book into private storage if empty
  const booksDir = path.join(PRIVATE_DATA_DIR, 'books');
  const existingBooks = fs.readdirSync(booksDir);
  if (existingBooks.length === 0) {
    // If public-books already has the sample book, copy it as starter master
    const samplePublicBook = path.join(PUBLIC_CONTENT_DIR, 'the-effective-executive');
    if (fs.existsSync(samplePublicBook)) {
      const targetDir = path.join(booksDir, 'the-effective-executive');
      if (!fs.existsSync(targetDir)) {
        try {
          fs.cpSync(samplePublicBook, targetDir, { recursive: true });
        } catch {
          // Ignore copy conflict if already created
        }
      }
    }
  }
}

/**
 * Path traversal safety check
 */
export function safeResolve(baseDir: string, ...segments: string[]): string {
  const resolved = path.resolve(baseDir, ...segments);
  const normalizedBase = path.normalize(baseDir);
  if (!resolved.startsWith(normalizedBase)) {
    throw new Error('Access denied: Path traversal detected outside allowed directory.');
  }
  return resolved;
}

/**
 * List all books stored in private master directory
 */
export function listMasterBooks(): Book[] {
  initPrivateStorage();
  const booksDir = path.join(PRIVATE_DATA_DIR, 'books');
  const entries = fs.readdirSync(booksDir, { withFileTypes: true });
  const books: Book[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const bookJsonPath = path.join(booksDir, entry.name, 'book.json');
      if (fs.existsSync(bookJsonPath)) {
        try {
          const raw = fs.readFileSync(bookJsonPath, 'utf-8');
          const book: Book = JSON.parse(raw);
          books.push(book);
        } catch (err) {
          console.error(`Error reading ${bookJsonPath}:`, err);
        }
      }
    }
  }

  return books.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * Get a specific book
 */
export function getMasterBook(bookId: string): Book | null {
  initPrivateStorage();
  const bookDir = safeResolve(path.join(PRIVATE_DATA_DIR, 'books'), bookId);
  const bookJson = path.join(bookDir, 'book.json');
  if (!fs.existsSync(bookJson)) return null;
  return JSON.parse(fs.readFileSync(bookJson, 'utf-8'));
}

/**
 * Save or update a book
 */
export function saveMasterBook(book: Book): Book {
  initPrivateStorage();
  // Sanitize id
  const sanitizedId = book.id.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const bookDir = safeResolve(path.join(PRIVATE_DATA_DIR, 'books'), sanitizedId);

  if (!fs.existsSync(bookDir)) {
    fs.mkdirSync(bookDir, { recursive: true });
  }

  const updatedBook: Book = {
    ...book,
    id: sanitizedId,
    updatedAt: new Date().toISOString(),
    createdAt: book.createdAt || new Date().toISOString(),
  };

  const bookJson = path.join(bookDir, 'book.json');
  fs.writeFileSync(bookJson, JSON.stringify(updatedBook, null, 2), 'utf-8');
  return updatedBook;
}

/**
 * Delete a book
 */
export function deleteMasterBook(bookId: string): boolean {
  initPrivateStorage();
  const bookDir = safeResolve(path.join(PRIVATE_DATA_DIR, 'books'), bookId);
  if (fs.existsSync(bookDir)) {
    fs.rmSync(bookDir, { recursive: true, force: true });
    return true;
  }
  return false;
}

/**
 * Get chapter detail
 */
export function getMasterChapter(bookId: string, chapterId: string): ChapterDetail | null {
  initPrivateStorage();
  const bookDir = safeResolve(path.join(PRIVATE_DATA_DIR, 'books'), bookId);
  const chJson = safeResolve(bookDir, `${chapterId}.json`);
  if (!fs.existsSync(chJson)) return null;
  return JSON.parse(fs.readFileSync(chJson, 'utf-8'));
}

/**
 * Save chapter
 */
export function saveMasterChapter(bookId: string, chapter: ChapterDetail): ChapterDetail {
  initPrivateStorage();
  const bookDir = safeResolve(path.join(PRIVATE_DATA_DIR, 'books'), bookId);
  if (!fs.existsSync(bookDir)) {
    throw new Error(`Book ${bookId} not found`);
  }

  const sanitizedChId = chapter.id.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const chJson = safeResolve(bookDir, `${sanitizedChId}.json`);
  const chMd = safeResolve(bookDir, `${sanitizedChId}.md`);

  const updatedChapter: ChapterDetail = {
    ...chapter,
    id: sanitizedChId,
    bookId,
    updatedAt: new Date().toISOString(),
    createdAt: chapter.createdAt || new Date().toISOString(),
  };

  // Write JSON
  fs.writeFileSync(chJson, JSON.stringify(updatedChapter, null, 2), 'utf-8');

  // Also write full human-readable Markdown format
  const mdContent = formatChapterToMarkdown(updatedChapter.title, updatedChapter.sections);
  fs.writeFileSync(chMd, mdContent, 'utf-8');

  // Update book metadata chapter list if not already present
  const book = getMasterBook(bookId);
  if (book) {
    const chapters = book.chapters || [];
    const existingIdx = chapters.findIndex(c => c.id === sanitizedChId);
    const meta = {
      id: sanitizedChId,
      bookId,
      order: chapter.order || chapters.length + 1,
      title: chapter.title,
      subtitle: chapter.subtitle,
      completed: chapter.completed,
      readingTimeMinutes: chapter.readingTimeMinutes,
      quotesCount: chapter.quotes?.length || 0,
      updatedAt: updatedChapter.updatedAt,
    };

    if (existingIdx >= 0) {
      chapters[existingIdx] = meta;
    } else {
      chapters.push(meta);
    }

    chapters.sort((a, b) => a.order - b.order);
    book.chapters = chapters;
    saveMasterBook(book);
  }

  return updatedChapter;
}

/**
 * Delete chapter
 */
export function deleteMasterChapter(bookId: string, chapterId: string): boolean {
  initPrivateStorage();
  const bookDir = safeResolve(path.join(PRIVATE_DATA_DIR, 'books'), bookId);
  const chJson = safeResolve(bookDir, `${chapterId}.json`);
  const chMd = safeResolve(bookDir, `${chapterId}.md`);

  let removed = false;
  if (fs.existsSync(chJson)) {
    fs.unlinkSync(chJson);
    removed = true;
  }
  if (fs.existsSync(chMd)) {
    fs.unlinkSync(chMd);
  }

  const book = getMasterBook(bookId);
  if (book && book.chapters) {
    book.chapters = book.chapters.filter(c => c.id !== chapterId);
    saveMasterBook(book);
  }

  return removed;
}

/**
 * Reorder chapters
 */
export function reorderMasterChapters(bookId: string, chapterIds: string[]): Book | null {
  const book = getMasterBook(bookId);
  if (!book || !book.chapters) return null;

  const newChapters = [...book.chapters];
  newChapters.sort((a, b) => {
    const idxA = chapterIds.indexOf(a.id);
    const idxB = chapterIds.indexOf(b.id);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  newChapters.forEach((ch, idx) => {
    ch.order = idx + 1;
  });

  book.chapters = newChapters;
  return saveMasterBook(book);
}

/**
 * SAFE PUBLISHING WHITELIST PIPELINE
 * Only books with status === 'public' will be copied to content/public-books/
 * Unknown, private, or draft books are strictly excluded!
 * Demoted books (formerly public, now private/draft) are completely wiped from content/public-books/
 */
export function publishWhitelistedBooks(): {
  publishedCount: number;
  publishedBooks: string[];
  removedCount: number;
} {
  initPrivateStorage();
  const allMasterBooks = listMasterBooks();

  // 1. Filter explicitly for 'public' books only
  const publicBooks = allMasterBooks.filter(b => b.status === 'public');
  const publicBookIds = new Set(publicBooks.map(b => b.id));

  // 2. Scan existing content/public-books/ directories and clean up non-public ones
  let removedCount = 0;
  if (fs.existsSync(PUBLIC_CONTENT_DIR)) {
    const existingInPublic = fs.readdirSync(PUBLIC_CONTENT_DIR, { withFileTypes: true });
    for (const item of existingInPublic) {
      if (item.isDirectory() && !publicBookIds.has(item.name)) {
        console.log(`[SafePublish] Removing demoted or non-public book directory: ${item.name}`);
        fs.rmSync(path.join(PUBLIC_CONTENT_DIR, item.name), { recursive: true, force: true });
        removedCount++;
      }
    }
  }

  // 3. Copy only public books to PUBLIC_CONTENT_DIR
  const publishedBookNames: string[] = [];
  for (const book of publicBooks) {
    const srcDir = safeResolve(path.join(PRIVATE_DATA_DIR, 'books'), book.id);
    const destDir = path.join(PUBLIC_CONTENT_DIR, book.id);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Write sanitized book.json
    fs.writeFileSync(path.join(destDir, 'book.json'), JSON.stringify(book, null, 2), 'utf-8');

    // Copy all chapter .json files for this public book
    const files = fs.readdirSync(srcDir);
    for (const file of files) {
      if (file.endsWith('.json') && file !== 'book.json') {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
      }
    }

    publishedBookNames.push(book.title);
  }

  // 4. Generate updated manifest
  const categories = Array.from(new Set(publicBooks.map(b => b.category)));
  const allTags = Array.from(new Set(publicBooks.flatMap(b => b.tags || [])));

  const manifest: PublicBooksManifest = {
    version: '2.0.0',
    generatedAt: new Date().toISOString(),
    siteTitle: 'Reading Notes 2.0 | 個人數位閱讀與知識整理平台',
    siteDescription: '深度閱讀、知識內化與公開分享系統 — 堅持原書結構、8 步結構化筆記、零付費依賴',
    totalPublicBooks: publicBooks.length,
    categories,
    tags: allTags,
    books: publicBooks,
  };

  fs.writeFileSync(
    path.join(PUBLIC_CONTENT_DIR, 'books-manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  return {
    publishedCount: publicBooks.length,
    publishedBooks: publishedBookNames,
    removedCount,
  };
}

/**
 * Backup entire private data store into timestamped JSON bundle
 */
export function createBackup(): { filename: string; timestamp: string; sizeBytes: number } {
  initPrivateStorage();
  const backupsDir = path.join(PRIVATE_DATA_DIR, 'backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-reading-notes-${timestamp}.json`;
  const targetPath = path.join(backupsDir, filename);

  const allBooks = listMasterBooks();
  const chaptersMap: Record<string, ChapterDetail[]> = {};

  for (const b of allBooks) {
    chaptersMap[b.id] = [];
    if (b.chapters) {
      for (const ch of b.chapters) {
        const detail = getMasterChapter(b.id, ch.id);
        if (detail) chaptersMap[b.id].push(detail);
      }
    }
  }

  const backupPayload = {
    schemaVersion: '2.0.0',
    exportedAt: new Date().toISOString(),
    books: allBooks,
    chapters: chaptersMap,
  };

  const jsonStr = JSON.stringify(backupPayload, null, 2);
  fs.writeFileSync(targetPath, jsonStr, 'utf-8');

  return {
    filename,
    timestamp,
    sizeBytes: Buffer.byteLength(jsonStr, 'utf-8'),
  };
}

/**
 * List backups
 */
export function listBackups(): Array<{ filename: string; sizeBytes: number; createdAt: string }> {
  initPrivateStorage();
  const backupsDir = path.join(PRIVATE_DATA_DIR, 'backups');
  if (!fs.existsSync(backupsDir)) return [];

  const files = fs.readdirSync(backupsDir);
  return files
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const full = path.join(backupsDir, f);
      const stat = fs.statSync(full);
      return {
        filename: f,
        sizeBytes: stat.size,
        createdAt: stat.birthtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Restore from backup file
 */
export function restoreBackup(filename: string): { restoredBooks: number; restoredChapters: number } {
  initPrivateStorage();
  const backupsDir = path.join(PRIVATE_DATA_DIR, 'backups');
  const fullPath = safeResolve(backupsDir, filename);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Backup file ${filename} not found.`);
  }

  const raw = fs.readFileSync(fullPath, 'utf-8');
  const data = JSON.parse(raw);

  // Validate format & version
  if (!data.schemaVersion || !data.books || !Array.isArray(data.books)) {
    throw new Error('Invalid backup schema or corrupted file.');
  }

  let restoredBooks = 0;
  let restoredChapters = 0;

  for (const book of data.books) {
    saveMasterBook(book);
    restoredBooks++;

    const chs = data.chapters?.[book.id] || [];
    for (const ch of chs) {
      saveMasterChapter(book.id, ch);
      restoredChapters++;
    }
  }

  return { restoredBooks, restoredChapters };
}
