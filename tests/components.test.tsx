import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProgressBar } from '../src/components/ProgressBar';
import { BookCard } from '../src/components/BookCard';
import { createDefaultChapterSections, formatChapterToMarkdown } from '../src/utils/template';
import { Book } from '../src/types';
import path from 'path';
import fs from 'fs';

describe('UI Components & Template Engine', () => {
  it('renders ProgressBar with percentage clamped properly', () => {
    const { rerender } = render(<ProgressBar progress={75} />);
    expect(screen.getByText('75%')).toBeInTheDocument();

    // Test clamped exceeding 100
    rerender(<ProgressBar progress={150} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders BookCard with title, author, and reading state', () => {
    const mockBook: Book = {
      id: 'mock-book',
      title: '測試書籍標題',
      author: '測試作者姓名',
      publisher: '天下文化',
      publishDate: '2026-01-01',
      isbn: '9789860000000',
      coverImage: '',
      category: '認知科學',
      tags: ['思考', '決策'],
      startDate: '2026-01-10',
      status: 'public',
      readingStatus: 'reading',
      progress: 40,
      motivation: '測試動機',
      introduction: '測試簡介',
      coreIdea: '測試核心思維',
      chapters: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    render(
      <BrowserRouter>
        <BookCard book={mockBook} showStatusBadge={true} />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: '測試書籍標題' })).toBeInTheDocument();
    expect(screen.getByText('測試作者姓名')).toBeInTheDocument();
    expect(screen.getByText('認知科學')).toBeInTheDocument();
    expect(screen.getByText('#思考')).toBeInTheDocument();
    expect(screen.getByText('閱讀中')).toBeInTheDocument();
  });

  it('formats chapter sections into standardized 8-step markdown document', () => {
    const defaultSections = createDefaultChapterSections('思考維度');
    const md = formatChapterToMarkdown('思考維度', defaultSections);

    expect(md).toContain('# 思考維度');
    expect(md).toContain('## 01. 章節導讀');
    expect(md).toContain('## 02. 核心摘要');
    expect(md).toContain('## 03. 專業知識');
    expect(md).toContain('## 04. 白話解釋');
    expect(md).toContain('## 05. 案例分析');
    expect(md).toContain('### 原書案例（原作者提出）');
    expect(md).toContain('### 讀者自行舉例（延伸實務）');
    expect(md).toContain('## 06. 重點整理');
    expect(md).toContain('## 07. 個人心得');
    expect(md).toContain('## 08. 本章總結');
  });

  it('renders image when coverImage is provided, and gracefully switches to default book cover on image error', () => {
    const bookWithCover: Book = {
      id: 'book-cover-test',
      title: '封面容錯測試書',
      author: '容錯作者',
      publisher: '測試出版',
      publishDate: '2026-01-01',
      isbn: '9780000000001',
      coverImage: 'content/public-books/book-cover-test/cover.jpg',
      category: '軟體測試',
      tags: ['測試'],
      startDate: '2026-01-01',
      status: 'public',
      readingStatus: 'reading',
      progress: 50,
      motivation: '',
      introduction: '',
      coreIdea: '',
      chapters: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    const { rerender } = render(
      <BrowserRouter>
        <BookCard book={bookWithCover} />
      </BrowserRouter>
    );

    // Initial render: <img> is rendered with cover url
    const imgElement = screen.getByRole('img', { name: '封面容錯測試書' });
    expect(imgElement).toBeInTheDocument();
    expect(imgElement).toHaveAttribute('src', expect.stringContaining('content/public-books/book-cover-test/cover.jpg'));

    // Trigger image error (e.g. 404 or corrupted asset)
    fireEvent.error(imgElement);

    // After error: img is unmounted and fallback default book cover is displayed
    expect(screen.queryByRole('img', { name: '封面容錯測試書' })).not.toBeInTheDocument();
    // Fallback title in cover container should be visible
    expect(screen.getAllByText('封面容錯測試書').length).toBeGreaterThanOrEqual(1);

    // Updating coverImage should reset error state
    const bookWithNewCover = { ...bookWithCover, coverImage: 'content/public-books/book-cover-test/cover-new.jpg' };
    rerender(
      <BrowserRouter>
        <BookCard book={bookWithNewCover} />
      </BrowserRouter>
    );

    const newImgElement = screen.getByRole('img', { name: '封面容錯測試書' });
    expect(newImgElement).toBeInTheDocument();
    expect(newImgElement).toHaveAttribute('src', expect.stringContaining('cover-new.jpg'));
  });

  it('directly renders default cover when coverImage is empty', () => {
    const bookWithoutCover: Book = {
      id: 'book-no-cover',
      title: '無封面書籍',
      author: '無封面作者',
      publisher: '測試出版',
      publishDate: '2026-01-01',
      isbn: '9780000000002',
      coverImage: '',
      category: '通用書籍',
      tags: [],
      startDate: '2026-01-01',
      status: 'public',
      readingStatus: 'unread',
      progress: 0,
      motivation: '',
      introduction: '',
      coreIdea: '',
      chapters: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    render(
      <BrowserRouter>
        <BookCard book={bookWithoutCover} />
      </BrowserRouter>
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getAllByText('無封面書籍').length).toBeGreaterThanOrEqual(1);
  });

  describe('Vite Static Content Middleware Logic Tests', () => {
    function handleContentMiddleware(req: any, res: any, next: any) {
      if (req.url && (req.url.startsWith('/content/') || req.url.includes('/content/'))) {
        const cleanUrl = req.url.split('?')[0];
        const contentIndex = cleanUrl.indexOf('/content/');
        if (contentIndex !== -1) {
          const relativeContentPath = cleanUrl.substring(contentIndex + 1);
          const publicContentRoot = path.resolve(process.cwd(), 'content');
          const fullPath = path.resolve(process.cwd(), relativeContentPath);

          if (!fullPath.startsWith(publicContentRoot + path.sep) && fullPath !== publicContentRoot) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Access denied' }));
            return;
          }

          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            let contentType = 'text/plain; charset=utf-8';
            if (fullPath.endsWith('.json')) contentType = 'application/json; charset=utf-8';
            else if (fullPath.endsWith('.jpg') || fullPath.endsWith('.jpeg')) contentType = 'image/jpeg';
            else if (fullPath.endsWith('.png')) contentType = 'image/png';
            else if (fullPath.endsWith('.webp')) contentType = 'image/webp';
            else if (fullPath.endsWith('.svg')) contentType = 'image/svg+xml';
            res.setHeader('Content-Type', contentType);
            return fs.createReadStream(fullPath).pipe(res);
          }

          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Asset not found', path: cleanUrl }));
          return;
        }
      }
      next();
    }

    it('returns HTTP 404 for missing static content asset instead of falling through to SPA HTML', () => {
      const req = { url: '/content/public-books/non-existent-book/cover.png' };
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };
      const next = vi.fn();

      handleContentMiddleware(req, res, next);

      expect(res.statusCode).toBe(404);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8');
      expect(res.end).toHaveBeenCalledWith(expect.stringContaining('Asset not found'));
      expect(next).not.toHaveBeenCalled();
    });

    it('returns HTTP 403 when path traversal is attempted under /content/', () => {
      const req = { url: '/content/../package.json' };
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };
      const next = vi.fn();

      handleContentMiddleware(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8');
      expect(res.end).toHaveBeenCalledWith(expect.stringContaining('Access denied'));
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next() for non-content URLs like /api or /books', () => {
      const req = { url: '/api/books' };
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };
      const next = vi.fn();

      handleContentMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.end).not.toHaveBeenCalled();
    });

    it('serves existing static asset with correct Content-Type', () => {
      const req = { url: '/content/public-books/books-manifest.json' };
      const pipeFn = vi.fn();
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };
      const next = vi.fn();

      const spyStream = vi.spyOn(fs, 'createReadStream').mockReturnValue({ pipe: pipeFn } as any);

      handleContentMiddleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8');
      expect(pipeFn).toHaveBeenCalledWith(res);
      expect(next).not.toHaveBeenCalled();

      spyStream.mockRestore();
    });
  });
});
