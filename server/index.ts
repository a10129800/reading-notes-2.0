import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import {
  initPrivateStorage,
  listMasterBooks,
  getMasterBook,
  saveMasterBook,
  deleteMasterBook,
  getMasterChapter,
  saveMasterChapter,
  deleteMasterChapter,
  reorderMasterChapters,
  publishWhitelistedBooks,
  createBackup,
  listBackups,
  restoreBackup,
  PRIVATE_DATA_DIR,
  PUBLIC_CONTENT_DIR,
} from './storage';
import { executePublishPipeline, fetchDeploymentStatus } from './gitPublisher';
import { formatChapterToMarkdown } from '../src/utils/template';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = '127.0.0.1'; // STRICT REQUIREMENT: Only listen on 127.0.0.1

// Path redaction helper to prevent leaking physical server filesystem paths
export function sanitizeErrorMessage(msg: string): string {
  if (!msg) return 'An error occurred';
  return msg
    .replace(/[a-zA-Z]:\\[^"'\n\r]*/g, '[LOCAL_PATH]')
    .replace(/\/[\w.-]+(\/[\w.-]+)+/g, '[LOCAL_PATH]');
}

// CORS restricted to local development origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS: Unauthorized local origin.'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Host header check to prevent DNS rebinding attacks
app.use((req: Request, res: Response, next: NextFunction) => {
  const host = req.headers.host;
  if (host && !host.startsWith('127.0.0.1') && !host.startsWith('localhost')) {
    res.status(403).json({ error: 'Forbidden: Request must originate from 127.0.0.1 or localhost.' });
    return;
  }
  next();
});

// Initialize directories
initPrivateStorage();

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    localOnly: true,
    host: HOST,
    privateStorage: '[CONFIGURED_PRIVATE_STORAGE]',
    publicTarget: '[CONFIGURED_PUBLIC_STORAGE]',
  });
});

// Manager Dashboard Stats (returns private, draft, AND public stats)
app.get('/api/stats', (_req: Request, res: Response) => {
  const allBooks = listMasterBooks();
  const publicBooks = allBooks.filter(b => b.status === 'public');
  const privateBooks = allBooks.filter(b => b.status === 'private');
  const draftBooks = allBooks.filter(b => b.status === 'draft');
  const completedBooks = allBooks.filter(b => b.readingStatus === 'completed');
  const readingBooks = allBooks.filter(b => b.readingStatus === 'reading');
  const totalChapters = allBooks.reduce((acc, b) => acc + (b.chapters?.length || 0), 0);
  const totalQuotes = allBooks.reduce((acc, b) => acc + (b.quotes?.length || 0), 0);

  const categoriesCount: Record<string, number> = {};
  allBooks.forEach(b => {
    categoriesCount[b.category] = (categoriesCount[b.category] || 0) + 1;
  });

  res.json({
    totalBooks: allBooks.length,
    publicBooks: publicBooks.length,
    privateBooks: privateBooks.length,
    draftBooks: draftBooks.length,
    completedBooks: completedBooks.length,
    readingBooks: readingBooks.length,
    totalChapters,
    totalQuotes,
    categoriesCount,
    recentBooks: allBooks.slice(0, 5),
  });
});

// List all master books
app.get('/api/books', (_req: Request, res: Response) => {
  const books = listMasterBooks();
  res.json(books);
});

// Get single book
app.get('/api/books/:id', (req: Request, res: Response) => {
  try {
    const book = getMasterBook(req.params.id as string);
    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    res.json(book);
  } catch (err: any) {
    res.status(400).json({ error: sanitizeErrorMessage(err.message) });
  }
});

// Create or update book
app.post('/api/books', (req: Request, res: Response) => {
  try {
    const book = req.body;
    if (!book || !book.id || !book.title) {
      res.status(400).json({ error: 'Book ID and Title are required' });
      return;
    }
    const saved = saveMasterBook(book);
    res.json(saved);
  } catch (err: any) {
    res.status(400).json({ error: sanitizeErrorMessage(err.message) });
  }
});

// Delete book
app.delete('/api/books/:id', (req: Request, res: Response) => {
  try {
    const ok = deleteMasterBook(req.params.id as string);
    if (!ok) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    res.json({ success: true, message: `Book ${req.params.id} deleted` });
  } catch (err: any) {
    res.status(400).json({ error: sanitizeErrorMessage(err.message) });
  }
});

// Get chapter
app.get('/api/books/:bookId/chapters/:chapterId', (req: Request, res: Response) => {
  try {
    const ch = getMasterChapter(req.params.bookId as string, req.params.chapterId as string);
    if (!ch) {
      res.status(404).json({ error: 'Chapter not found' });
      return;
    }
    res.json(ch);
  } catch (err: any) {
    res.status(400).json({ error: sanitizeErrorMessage(err.message) });
  }
});

// Save chapter
app.post('/api/books/:bookId/chapters', (req: Request, res: Response) => {
  try {
    const chapter = req.body;
    if (!chapter || !chapter.id || !chapter.title) {
      res.status(400).json({ error: 'Chapter ID and Title are required' });
      return;
    }
    const saved = saveMasterChapter(req.params.bookId as string, chapter);
    res.json(saved);
  } catch (err: any) {
    res.status(400).json({ error: sanitizeErrorMessage(err.message) });
  }
});

// Delete chapter
app.delete('/api/books/:bookId/chapters/:chapterId', (req: Request, res: Response) => {
  try {
    const ok = deleteMasterChapter(req.params.bookId as string, req.params.chapterId as string);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(400).json({ error: sanitizeErrorMessage(err.message) });
  }
});

// Reorder chapters
app.post('/api/books/:bookId/reorder', (req: Request, res: Response) => {
  try {
    const { chapterIds } = req.body;
    if (!Array.isArray(chapterIds)) {
      res.status(400).json({ error: 'chapterIds must be an array' });
      return;
    }
    const updated = reorderMasterChapters(req.params.bookId as string, chapterIds);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: sanitizeErrorMessage(err.message) });
  }
});

// Publish preview
app.get('/api/publish/preview', (_req: Request, res: Response) => {
  const allMasterBooks = listMasterBooks();
  const willPublish = allMasterBooks.filter(b => b.status === 'public');
  const willKeepPrivate = allMasterBooks.filter(b => b.status === 'private');
  const willKeepDraft = allMasterBooks.filter(b => b.status === 'draft');

  res.json({
    willPublish: willPublish.map(b => ({ id: b.id, title: b.title, chaptersCount: b.chapters?.length || 0 })),
    willKeepPrivate: willKeepPrivate.map(b => ({ id: b.id, title: b.title })),
    willKeepDraft: willKeepDraft.map(b => ({ id: b.id, title: b.title })),
  });
});

// Trigger safe whitelist publishing (Local only)
app.post('/api/publish', (_req: Request, res: Response) => {
  try {
    const result = publishWhitelistedBooks();
    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: `Publishing failed: ${sanitizeErrorMessage(err.message)}` });
  }
});

// Trigger complete end-to-end publish pipeline (Local Sync + Security + Build + Git Stage + Commit + Push + Deployment)
app.post('/api/publish/pipeline', async (req: Request, res: Response) => {
  try {
    const commitAndPush = req.body?.commitAndPush !== false;
    const result = await executePublishPipeline({ commitAndPush });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage(err.message),
    });
  }
});

// Query live GitHub Actions deployment status
app.get('/api/publish/deployment-status', async (_req: Request, res: Response) => {
  try {
    const status = await fetchDeploymentStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: sanitizeErrorMessage(err.message) });
  }
});

// Create backup
app.post('/api/backup', (_req: Request, res: Response) => {
  try {
    const info = createBackup();
    res.json({ success: true, backup: info });
  } catch (err: any) {
    res.status(500).json({ error: sanitizeErrorMessage(err.message) });
  }
});

// List backups
app.get('/api/backups', (_req: Request, res: Response) => {
  res.json(listBackups());
});

// Restore backup
app.post('/api/restore', (req: Request, res: Response) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      res.status(400).json({ error: 'filename is required' });
      return;
    }
    const result = restoreBackup(filename);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: sanitizeErrorMessage(err.message) });
  }
});

// Export book markdown bundle
app.get('/api/export/markdown/:bookId', (req: Request, res: Response) => {
  try {
    const book = getMasterBook(req.params.bookId as string);
    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }

    let bundle = `# 《${book.title}》閱讀筆記全集\n\n`;
    bundle += `> 作者：${book.author} | 出版社：${book.publisher || '未填'} | ISBN: ${book.isbn || 'N/A'}\n`;
    bundle += `> 研讀進度：${book.progress}% | 狀態：${book.readingStatus}\n\n`;
    bundle += `## 全書核心思想\n${book.coreIdea}\n\n`;
    bundle += `## 書籍導讀\n${book.introduction}\n\n`;
    bundle += `## 研讀動機\n${book.motivation}\n\n`;
    bundle += `---\n\n`;

    if (book.chapters) {
      for (const chMeta of book.chapters) {
        const detail = getMasterChapter(book.id, chMeta.id);
        if (detail) {
          bundle += formatChapterToMarkdown(detail.title, detail.sections);
          bundle += `\n\n---\n\n`;
        }
      }
    }

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(book.id)}-full-notes.md"`);
    res.send(bundle);
  } catch (err: any) {
    res.status(400).json({ error: sanitizeErrorMessage(err.message) });
  }
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', sanitizeErrorMessage(err.message));
  res.status(500).json({ error: sanitizeErrorMessage(err.message) || 'Internal Server Error' });
});

// Start listening strictly on 127.0.0.1
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`=======================================================`);
    console.log(` Reading Notes 2.0 Local Manager Service LIVE`);
    console.log(` Listening on: http://${HOST}:${PORT}`);
    console.log(` Private Storage: ${PRIVATE_DATA_DIR}`);
    console.log(` Security Mode: STRICT 127.0.0.1 (No external network exposure)`);
    console.log(`=======================================================`);
  });
}

export default app;
