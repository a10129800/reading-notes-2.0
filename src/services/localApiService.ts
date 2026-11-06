import { Book, ChapterDetail, DashboardStats, PublishPipelineResult, DeploymentStatus } from '../types';

class LocalApiService {
  private baseUrl = '/api';

  async isLive(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async getStats(): Promise<DashboardStats> {
    const res = await fetch(`${this.baseUrl}/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  }

  async getBooks(): Promise<Book[]> {
    const res = await fetch(`${this.baseUrl}/books`);
    if (!res.ok) throw new Error('Failed to fetch books');
    return res.json();
  }

  async getBook(id: string): Promise<Book> {
    const res = await fetch(`${this.baseUrl}/books/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Failed to fetch book');
    return res.json();
  }

  async saveBook(book: Partial<Book>): Promise<Book> {
    const res = await fetch(`${this.baseUrl}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save book');
    }
    return res.json();
  }

  async deleteBook(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/books/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete book');
    }
  }

  async getChapter(bookId: string, chapterId: string): Promise<ChapterDetail> {
    const res = await fetch(`${this.baseUrl}/books/${encodeURIComponent(bookId)}/chapters/${encodeURIComponent(chapterId)}`);
    if (!res.ok) throw new Error('Failed to fetch chapter');
    return res.json();
  }

  async saveChapter(bookId: string, chapter: Partial<ChapterDetail>): Promise<ChapterDetail> {
    const res = await fetch(`${this.baseUrl}/books/${encodeURIComponent(bookId)}/chapters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chapter),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save chapter');
    }
    return res.json();
  }

  async deleteChapter(bookId: string, chapterId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/books/${encodeURIComponent(bookId)}/chapters/${encodeURIComponent(chapterId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete chapter');
  }

  async reorderChapters(bookId: string, chapterIds: string[]): Promise<Book> {
    const res = await fetch(`${this.baseUrl}/books/${encodeURIComponent(bookId)}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterIds }),
    });
    if (!res.ok) throw new Error('Failed to reorder chapters');
    return res.json();
  }

  async getPublishPreview(): Promise<{
    willPublish: Array<{ id: string; title: string; chaptersCount: number }>;
    willKeepPrivate: Array<{ id: string; title: string }>;
    willKeepDraft: Array<{ id: string; title: string }>;
  }> {
    const res = await fetch(`${this.baseUrl}/publish/preview`);
    if (!res.ok) throw new Error('Failed to get publish preview');
    return res.json();
  }

  async publish(): Promise<{
    success: boolean;
    publishedCount: number;
    publishedBooks: string[];
    removedCount: number;
    timestamp: string;
  }> {
    const res = await fetch(`${this.baseUrl}/publish`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Publishing failed');
    }
    return res.json();
  }

  async publishPipeline(commitAndPush = true): Promise<PublishPipelineResult> {
    const res = await fetch(`${this.baseUrl}/publish/pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commitAndPush }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Publish pipeline failed');
    }
    return res.json();
  }

  async getDeploymentStatus(): Promise<DeploymentStatus> {
    const res = await fetch(`${this.baseUrl}/publish/deployment-status`);
    if (!res.ok) throw new Error('Failed to fetch deployment status');
    return res.json();
  }

  async createBackup(): Promise<{ filename: string; timestamp: string; sizeBytes: number }> {
    const res = await fetch(`${this.baseUrl}/backup`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to create backup');
    const data = await res.json();
    return data.backup;
  }

  async getBackups(): Promise<Array<{ filename: string; sizeBytes: number; createdAt: string }>> {
    const res = await fetch(`${this.baseUrl}/backups`);
    if (!res.ok) throw new Error('Failed to fetch backups');
    return res.json();
  }

  async restoreBackup(filename: string): Promise<{ restoredBooks: number; restoredChapters: number }> {
    const res = await fetch(`${this.baseUrl}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to restore backup');
    }
    return res.json();
  }

  getExportMarkdownUrl(bookId: string): string {
    return `${this.baseUrl}/export/markdown/${encodeURIComponent(bookId)}`;
  }

  getBookCoverApiUrl(bookId: string, timestamp?: number): string {
    return `${this.baseUrl}/books/${encodeURIComponent(bookId)}/cover?t=${timestamp || Date.now()}`;
  }

  async uploadBookCover(bookId: string, file: File): Promise<{ success: boolean; coverImage: string; filename: string; size: number }> {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const clean = result.includes(',') ? result.split(',')[1] : result;
        resolve(clean);
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });

    const res = await fetch(`${this.baseUrl}/books/${encodeURIComponent(bookId)}/cover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        base64,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload cover');
    }

    return res.json();
  }

  async deleteBookCover(bookId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.baseUrl}/books/${encodeURIComponent(bookId)}/cover`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete cover');
    }

    return res.json();
  }
}

export const localApiService = new LocalApiService();

