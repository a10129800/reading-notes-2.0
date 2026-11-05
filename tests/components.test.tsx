import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProgressBar } from '../src/components/ProgressBar';
import { BookCard } from '../src/components/BookCard';
import { createDefaultChapterSections, formatChapterToMarkdown } from '../src/utils/template';
import { Book } from '../src/types';

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
});
