import fs from 'fs';
import path from 'path';
import { Book, ChapterDetail, PublicBooksManifest, BookStatus, PublishRecord } from '../src/types';
import { createDefaultChapterSections, formatChapterToMarkdown } from '../src/utils/template';

// Sibling directory outside public Git repository
export const DEFAULT_PRIVATE_DIR = path.resolve(process.cwd(), '../Reading-Notes-Private');
export const getPrivateDataDir = () => process.env.PRIVATE_DATA_DIR || DEFAULT_PRIVATE_DIR;
export let PRIVATE_DATA_DIR = getPrivateDataDir();

// Public books destination in the public repository
export const DEFAULT_PUBLIC_DIR = path.resolve(process.cwd(), 'content/public-books');
export const getPublicContentDir = () => process.env.PUBLIC_CONTENT_DIR || DEFAULT_PUBLIC_DIR;
export let PUBLIC_CONTENT_DIR = getPublicContentDir();

export {
  MAX_COVER_SIZE,
  MAX_COVER_WIDTH,
  MAX_COVER_HEIGHT,
  MAX_COVER_PIXELS,
  MIN_COVER_WIDTH,
  MIN_COVER_HEIGHT,
  detectImageFormat,
  inspectAndValidateImage,
} from './imageValidator';
import {
  MAX_COVER_SIZE,
  detectImageFormat,
  inspectAndValidateImage,
} from './imageValidator';

export const ALLOWED_COVER_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;
export const ALLOWED_COVER_FILENAMES = ['cover.jpg', 'cover.jpeg', 'cover.png', 'cover.webp'] as const;

/**
 * Refresh exported path constants if environment variables changed at runtime
 */
export function refreshStoragePaths() {
  PRIVATE_DATA_DIR = getPrivateDataDir();
  PUBLIC_CONTENT_DIR = getPublicContentDir();
}

/**
 * Initialize directories if they don't exist
 */
export function initPrivateStorage() {
  const privateDir = getPrivateDataDir();
  const publicDir = getPublicContentDir();
  const dirs = [
    privateDir,
    path.join(privateDir, 'books'),
    path.join(privateDir, 'drafts'),
    path.join(privateDir, 'images'),
    path.join(privateDir, 'attachments'),
    path.join(privateDir, 'backups'),
    publicDir,
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Seed sample book into private storage if missing
  const booksDir = path.join(privateDir, 'books');
  const targetDir = path.join(booksDir, 'the-effective-executive');
  if (!fs.existsSync(targetDir)) {
    const samplePublicBook = path.join(DEFAULT_PUBLIC_DIR, 'the-effective-executive');
    if (fs.existsSync(samplePublicBook)) {
      try {
        fs.cpSync(samplePublicBook, targetDir, { recursive: true });
      } catch {
        // Ignore copy conflict if already created
      }
    }
  }
}

/**
 * Path traversal safety check
 */
export function safeResolve(baseDir: string, ...segments: string[]): string {
  // Check for null bytes or illegal characters
  for (const seg of segments) {
    if (typeof seg !== 'string' || seg.includes('\0')) {
      throw new Error('Access denied: Illegal characters detected in path segment.');
    }
  }

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
  const booksDir = path.join(getPrivateDataDir(), 'books');
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
  const bookDir = safeResolve(path.join(getPrivateDataDir(), 'books'), bookId);
  const bookJson = path.join(bookDir, 'book.json');
  if (!fs.existsSync(bookJson)) return null;
  return JSON.parse(fs.readFileSync(bookJson, 'utf-8'));
}

/**
 * Save or update a book
 */
export function saveMasterBook(book: Book): Book {
  initPrivateStorage();
  if (!book || typeof book !== 'object') {
    throw new Error('Invalid book payload: must be an object');
  }

  const rawId = String(book.id || '').trim();
  if (!rawId) {
    throw new Error('Book ID is required and cannot be empty.');
  }

  // Sanitize id: only lower-case alphanumerics and hyphens/underscores
  const sanitizedId = rawId.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  if (!sanitizedId) {
    throw new Error('Invalid Book ID after sanitization.');
  }

  const bookDir = safeResolve(path.join(getPrivateDataDir(), 'books'), sanitizedId);

  if (!fs.existsSync(bookDir)) {
    fs.mkdirSync(bookDir, { recursive: true });
  }

  // Strict status whitelist: default to 'draft' if missing or unrecognized
  const validStatuses: BookStatus[] = ['public', 'private', 'draft'];
  const sanitizedStatus: BookStatus = validStatuses.includes(book.status) ? book.status : 'draft';

  const updatedBook: Book = {
    ...book,
    id: sanitizedId,
    title: String(book.title || '未命名書籍').trim(),
    status: sanitizedStatus,
    readingStatus: ['unread', 'reading', 'completed', 'abandoned'].includes(book.readingStatus)
      ? book.readingStatus
      : 'reading',
    progress: typeof book.progress === 'number' ? Math.min(100, Math.max(0, book.progress)) : 0,
    tags: Array.isArray(book.tags) ? book.tags : [],
    chapters: Array.isArray(book.chapters) ? book.chapters : [],
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
  const bookDir = safeResolve(path.join(getPrivateDataDir(), 'books'), bookId);
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
  const bookDir = safeResolve(path.join(getPrivateDataDir(), 'books'), bookId);
  const chJson = safeResolve(bookDir, `${chapterId}.json`);
  if (!fs.existsSync(chJson)) return null;
  return JSON.parse(fs.readFileSync(chJson, 'utf-8'));
}

/**
 * Save chapter
 */
export function saveMasterChapter(bookId: string, chapter: ChapterDetail): ChapterDetail {
  initPrivateStorage();
  const bookDir = safeResolve(path.join(getPrivateDataDir(), 'books'), bookId);
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
  const bookDir = safeResolve(path.join(getPrivateDataDir(), 'books'), bookId);
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
 * Save book cover to private storage with atomic rename and signature validation
 */
export function saveBookCover(
  bookId: string,
  buffer: Buffer
): { success: boolean; coverImage: string; filename: string; size: number } {
  initPrivateStorage();
  if (!buffer || buffer.length === 0) {
    throw new Error('Image file is empty (0 bytes).');
  }
  if (buffer.length > MAX_COVER_SIZE) {
    throw new Error(`Image file exceeds 5MB limit (${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`);
  }

  const inspection = inspectAndValidateImage(buffer);
  if (!inspection.valid) {
    throw new Error(`Invalid image content: ${inspection.error}`);
  }

  const format = inspection.format!;

  const book = getMasterBook(bookId);
  if (!book) {
    throw new Error(`Book "${bookId}" not found.`);
  }

  const bookDir = safeResolve(path.join(getPrivateDataDir(), 'books'), bookId);
  if (!fs.existsSync(bookDir)) {
    fs.mkdirSync(bookDir, { recursive: true });
  }

  const targetFilename = `cover.${format}`;
  const targetPath = safeResolve(bookDir, targetFilename);
  const tempPath = safeResolve(bookDir, `.cover.tmp.${Date.now()}`);

  // Atomic write via temp file
  fs.writeFileSync(tempPath, buffer);
  try {
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    fs.renameSync(tempPath, targetPath);
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch {}
    }
    throw err;
  }

  // Clean old cover files with other extensions
  for (const ext of ALLOWED_COVER_EXTENSIONS) {
    if (ext !== format) {
      const oldPath = path.join(bookDir, `cover.${ext}`);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch {}
      }
    }
  }

  // Update book.json with local cover reference
  book.coverImage = targetFilename;
  saveMasterBook(book);

  return {
    success: true,
    coverImage: targetFilename,
    filename: targetFilename,
    size: buffer.length,
  };
}

/**
 * Get active book cover file path and MIME type from private storage
 */
export function getBookCoverPath(
  bookId: string
): { filePath: string; mime: string; filename: string } | null {
  initPrivateStorage();
  const book = getMasterBook(bookId);
  if (!book) return null;

  const bookDir = safeResolve(path.join(getPrivateDataDir(), 'books'), bookId);
  if (!fs.existsSync(bookDir)) return null;

  for (const ext of ALLOWED_COVER_EXTENSIONS) {
    const filename = `cover.${ext}`;
    const filePath = path.join(bookDir, filename);
    if (fs.existsSync(filePath)) {
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      return { filePath, mime, filename };
    }
  }

  return null;
}

/**
 * Delete book cover from private storage
 */
export function deleteBookCover(bookId: string): boolean {
  initPrivateStorage();
  const book = getMasterBook(bookId);
  if (!book) return false;

  const bookDir = safeResolve(path.join(getPrivateDataDir(), 'books'), bookId);
  let removed = false;
  if (fs.existsSync(bookDir)) {
    for (const ext of ALLOWED_COVER_EXTENSIONS) {
      const filePath = path.join(bookDir, `cover.${ext}`);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          removed = true;
        } catch {}
      }
    }
  }

  book.coverImage = '';
  saveMasterBook(book);
  return removed;
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
  const publicDir = getPublicContentDir();
  const privateDir = getPrivateDataDir();
  const allMasterBooks = listMasterBooks();

  // 1. Filter explicitly for 'public' books only
  const publicBooks = allMasterBooks.filter(b => b.status === 'public');
  const publicBookIds = new Set(publicBooks.map(b => b.id));

  // 2. Scan existing public-books directories and clean up non-public ones
  let removedCount = 0;
  if (fs.existsSync(publicDir)) {
    const existingInPublic = fs.readdirSync(publicDir, { withFileTypes: true });
    for (const item of existingInPublic) {
      if (item.isDirectory() && !publicBookIds.has(item.name)) {
        console.log(`[SafePublish] Removing demoted or non-public book directory: ${item.name}`);
        fs.rmSync(path.join(publicDir, item.name), { recursive: true, force: true });
        removedCount++;
      }
    }
  }

  // 3. Copy only public books to publicDir
  const publishedBookNames: string[] = [];
  const publishedBooksForManifest: Book[] = [];
  for (const book of publicBooks) {
    const srcDir = safeResolve(path.join(privateDir, 'books'), book.id);
    const destDir = path.join(publicDir, book.id);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Clean existing cover files in destDir first
    for (const ext of ALLOWED_COVER_EXTENSIONS) {
      const existingCoverInDest = path.join(destDir, `cover.${ext}`);
      if (fs.existsSync(existingCoverInDest)) {
        fs.unlinkSync(existingCoverInDest);
      }
    }

    // Check if source book has a legitimate local cover
    let publicCoverImage = book.coverImage || '';
    let foundCoverFilename: string | null = null;
    for (const ext of ALLOWED_COVER_EXTENSIONS) {
      const srcCoverPath = path.join(srcDir, `cover.${ext}`);
      if (fs.existsSync(srcCoverPath)) {
        foundCoverFilename = `cover.${ext}`;
        break;
      }
    }

    if (foundCoverFilename) {
      const srcCover = path.join(srcDir, foundCoverFilename);
      const destCover = path.join(destDir, foundCoverFilename);
      fs.copyFileSync(srcCover, destCover);
      publicCoverImage = `content/public-books/${book.id}/${foundCoverFilename}`;
    }

    // Write sanitized book.json with resolved public coverImage
    const publicBookPayload: Book = {
      ...book,
      coverImage: publicCoverImage,
    };
    fs.writeFileSync(path.join(destDir, 'book.json'), JSON.stringify(publicBookPayload, null, 2), 'utf-8');
    publishedBooksForManifest.push(publicBookPayload);

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
  const categories = Array.from(new Set(publishedBooksForManifest.map(b => b.category)));
  const allTags = Array.from(new Set(publishedBooksForManifest.flatMap(b => b.tags || [])));

  const manifestPath = path.join(publicDir, 'books-manifest.json');
  let manifestGeneratedAt = new Date().toISOString();

  // Smart check: preserve existing generatedAt if manifest content (excluding timestamp) has zero changes
  if (fs.existsSync(manifestPath) && removedCount === 0) {
    try {
      const existingManifest: PublicBooksManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const isSameCount = existingManifest.totalPublicBooks === publishedBooksForManifest.length;
      const isSameBooks = JSON.stringify(existingManifest.books) === JSON.stringify(publishedBooksForManifest);
      const isSameCategories = JSON.stringify(existingManifest.categories) === JSON.stringify(categories);
      const isSameTags = JSON.stringify(existingManifest.tags) === JSON.stringify(allTags);
      if (isSameCount && isSameBooks && isSameCategories && isSameTags && existingManifest.generatedAt) {
        manifestGeneratedAt = existingManifest.generatedAt;
      }
    } catch {}
  }

  const manifest: PublicBooksManifest = {
    version: '2.0.0',
    generatedAt: manifestGeneratedAt,
    siteTitle: 'Reading Notes 2.0 | 個人數位閱讀與知識整理平台',
    siteDescription: '深度閱讀、知識內化與公開分享系統 — 堅持原書結構、8 步結構化筆記、零付費依賴',
    totalPublicBooks: publishedBooksForManifest.length,
    categories,
    tags: allTags,
    books: publishedBooksForManifest,
  };

  fs.writeFileSync(
    path.join(publicDir, 'books-manifest.json'),
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
 * Includes books, chapters, images, and attachments
 */
export function createBackup(): { filename: string; timestamp: string; sizeBytes: number } {
  initPrivateStorage();
  const privateDir = getPrivateDataDir();
  const backupsDir = path.join(privateDir, 'backups');
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

  // Backup images as base64
  const imagesDir = path.join(privateDir, 'images');
  const imagesMap: Record<string, string> = {};
  if (fs.existsSync(imagesDir)) {
    const imgFiles = fs.readdirSync(imagesDir);
    for (const f of imgFiles) {
      const full = path.join(imagesDir, f);
      if (fs.statSync(full).isFile()) {
        imagesMap[f] = fs.readFileSync(full).toString('base64');
      }
    }
  }

  // Backup attachments as base64
  const attachmentsDir = path.join(privateDir, 'attachments');
  const attachmentsMap: Record<string, string> = {};
  if (fs.existsSync(attachmentsDir)) {
    const attFiles = fs.readdirSync(attachmentsDir);
    for (const f of attFiles) {
      const full = path.join(attachmentsDir, f);
      if (fs.statSync(full).isFile()) {
        attachmentsMap[f] = fs.readFileSync(full).toString('base64');
      }
    }
  }

  // Backup book covers as base64
  const bookCoversMap: Record<string, { filename: string; base64: string }> = {};
  for (const b of allBooks) {
    const bookDir = safeResolve(path.join(privateDir, 'books'), b.id);
    if (fs.existsSync(bookDir)) {
      for (const ext of ALLOWED_COVER_EXTENSIONS) {
        const coverPath = path.join(bookDir, `cover.${ext}`);
        if (fs.existsSync(coverPath)) {
          bookCoversMap[b.id] = {
            filename: `cover.${ext}`,
            base64: fs.readFileSync(coverPath).toString('base64'),
          };
          break;
        }
      }
    }
  }

  const backupPayload = {
    schemaVersion: '2.0.0',
    exportedAt: new Date().toISOString(),
    books: allBooks,
    chapters: chaptersMap,
    images: imagesMap,
    attachments: attachmentsMap,
    bookCovers: bookCoversMap,
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
  const backupsDir = path.join(getPrivateDataDir(), 'backups');
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
export function restoreBackup(filename: string): {
  restoredBooks: number;
  restoredChapters: number;
  restoredImages: number;
  restoredAttachments: number;
  restoredCovers?: number;
} {
  initPrivateStorage();
  const privateDir = getPrivateDataDir();
  const backupsDir = path.join(privateDir, 'backups');
  // Sanitize filename to prevent directory traversal
  const sanitizedFilename = path.basename(filename);
  const fullPath = safeResolve(backupsDir, sanitizedFilename);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Backup file ${sanitizedFilename} not found.`);
  }

  let data: any;
  try {
    const raw = fs.readFileSync(fullPath, 'utf-8');
    data = JSON.parse(raw);
  } catch (err: any) {
    throw new Error(`Corrupted backup archive: Invalid JSON format (${err.message}).`);
  }

  // Validate format & schema version
  if (!data || typeof data !== 'object') {
    throw new Error('Corrupted backup archive: Invalid payload structure.');
  }

  if (data.schemaVersion !== '2.0.0') {
    throw new Error(`Incompatible backup schema version: "${data.schemaVersion || 'unknown'}". Expected "2.0.0".`);
  }

  if (!Array.isArray(data.books)) {
    throw new Error('Corrupted backup archive: Missing or invalid books array.');
  }

  let restoredBooks = 0;
  let restoredChapters = 0;
  let restoredImages = 0;
  let restoredAttachments = 0;

  for (const book of data.books) {
    saveMasterBook(book);
    restoredBooks++;

    const chs = data.chapters?.[book.id] || [];
    for (const ch of chs) {
      saveMasterChapter(book.id, ch);
      restoredChapters++;
    }
  }

  // Restore images
  if (data.images && typeof data.images === 'object') {
    const imagesDir = path.join(privateDir, 'images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
    for (const [imgName, b64] of Object.entries(data.images)) {
      try {
        const safeName = path.basename(imgName);
        const dest = safeResolve(imagesDir, safeName);
        fs.writeFileSync(dest, Buffer.from(b64 as string, 'base64'));
        restoredImages++;
      } catch (err) {
        console.warn(`Failed to restore image ${imgName}:`, err);
      }
    }
  }

  // Restore attachments
  if (data.attachments && typeof data.attachments === 'object') {
    const attachmentsDir = path.join(privateDir, 'attachments');
    if (!fs.existsSync(attachmentsDir)) fs.mkdirSync(attachmentsDir, { recursive: true });
    for (const [attName, b64] of Object.entries(data.attachments)) {
      try {
        const safeName = path.basename(attName);
        const dest = safeResolve(attachmentsDir, safeName);
        fs.writeFileSync(dest, Buffer.from(b64 as string, 'base64'));
        restoredAttachments++;
      } catch (err) {
        console.warn(`Failed to restore attachment ${attName}:`, err);
      }
    }
  }

  // Restore book covers
  let restoredCovers = 0;
  if (data.bookCovers && typeof data.bookCovers === 'object') {
    for (const [bookId, coverData] of Object.entries(data.bookCovers as Record<string, any>)) {
      if (coverData && coverData.filename && coverData.base64) {
        const safeName = path.basename(coverData.filename);
        if (ALLOWED_COVER_FILENAMES.includes(safeName.toLowerCase() as any)) {
          try {
            const bookDir = safeResolve(path.join(privateDir, 'books'), bookId);
            if (!fs.existsSync(bookDir)) fs.mkdirSync(bookDir, { recursive: true });
            const dest = safeResolve(bookDir, safeName);
            fs.writeFileSync(dest, Buffer.from(coverData.base64 as string, 'base64'));
            restoredCovers++;
          } catch (err) {
            console.warn(`Failed to restore cover for ${bookId}:`, err);
          }
        }
      }
    }
  }

  return { restoredBooks, restoredChapters, restoredImages, restoredAttachments, restoredCovers };
}

/**
 * Publish History Persistence (Strictly stored in private data directory)
 */
const MAX_PUBLISH_HISTORY = 20;

export function getPublishHistory(): PublishRecord[] {
  initPrivateStorage();
  const historyPath = path.join(getPrivateDataDir(), 'publish-history.json');
  if (!fs.existsSync(historyPath)) return [];
  try {
    const raw = fs.readFileSync(historyPath, 'utf-8');
    const list: PublishRecord[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || '')).slice(0, MAX_PUBLISH_HISTORY);
  } catch (err) {
    console.warn('[Storage] Failed to read publish-history.json:', err);
    return [];
  }
}

export function savePublishRecord(record: PublishRecord): void {
  initPrivateStorage();
  const historyPath = path.join(getPrivateDataDir(), 'publish-history.json');
  const tempPath = path.join(getPrivateDataDir(), `.publish-history.tmp.${Date.now()}`);
  try {
    const current = getPublishHistory();
    const existingIndex = current.findIndex(r => r.taskId === record.taskId);
    if (existingIndex >= 0) {
      current[existingIndex] = { ...current[existingIndex], ...record };
    } else {
      current.unshift(record);
    }
    const trimmed = current.slice(0, MAX_PUBLISH_HISTORY);
    fs.writeFileSync(tempPath, JSON.stringify(trimmed, null, 2), 'utf-8');
    fs.renameSync(tempPath, historyPath);
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch {}
    }
    console.warn('[Storage] Failed to save publish record:', err);
  }
}

export function getLatestPublishRecord(): PublishRecord | null {
  const history = getPublishHistory();
  return history.length > 0 ? history[0] : null;
}

export function getPublishRecordById(taskId: string): PublishRecord | null {
  if (!taskId) return null;
  const history = getPublishHistory();
  return history.find(r => r.taskId === taskId) || null;
}
