import { Book, ChapterDetail, PublicBooksManifest, QuoteItem } from '../types';

class PublicDataService {
  private manifestCache: PublicBooksManifest | null = null;
  private chapterCache: Map<string, ChapterDetail> = new Map();

  // Get base url for relative asset loading
  private getBaseUrl(): string {
    const base = import.meta.env.BASE_URL || './';
    return base.endsWith('/') ? base : `${base}/`;
  }

  // Load manifest
  async getManifest(forceRefresh = false): Promise<PublicBooksManifest> {
    if (this.manifestCache && !forceRefresh) {
      return this.manifestCache;
    }

    try {
      const url = `${this.getBaseUrl()}content/public-books/books-manifest.json?t=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load manifest: ${res.status} ${res.statusText}`);
      }
      const data: PublicBooksManifest = await res.json();
      this.manifestCache = data;
      return data;
    } catch (err) {
      console.warn('Error fetching manifest, falling back to empty manifest:', err);
      return {
        version: '2.0.0',
        generatedAt: new Date().toISOString(),
        siteTitle: 'Reading Notes 2.0',
        siteDescription: '個人數位閱讀筆記與知識分享平台',
        totalPublicBooks: 0,
        categories: [],
        tags: [],
        books: []
      };
    }
  }

  // Get all public books
  async getPublicBooks(): Promise<Book[]> {
    const manifest = await this.getManifest();
    // Strict whitelist: ensure only status === 'public' books are exposed
    return (manifest.books || []).filter(b => b.status === 'public');
  }

  // Get single book by ID
  async getBook(bookId: string): Promise<Book | null> {
    const books = await this.getPublicBooks();
    const found = books.find(b => b.id === bookId);
    if (found) return found;

    // Direct fetch fallback
    try {
      const url = `${this.getBaseUrl()}content/public-books/${encodeURIComponent(bookId)}/book.json`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const book: Book = await res.json();
      if (book.status !== 'public') return null; // Safety check
      return book;
    } catch {
      return null;
    }
  }

  // Get chapter detail
  async getChapter(bookId: string, chapterId: string): Promise<ChapterDetail | null> {
    const cacheKey = `${bookId}:${chapterId}`;
    if (this.chapterCache.has(cacheKey)) {
      return this.chapterCache.get(cacheKey)!;
    }

    try {
      const url = `${this.getBaseUrl()}content/public-books/${encodeURIComponent(bookId)}/${encodeURIComponent(chapterId)}.json`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const chapter: ChapterDetail = await res.json();
      this.chapterCache.set(cacheKey, chapter);
      return chapter;
    } catch (err) {
      console.error(`Failed to load chapter ${chapterId} for book ${bookId}:`, err);
      return null;
    }
  }

  // Gather all quotes across all public books
  async getAllPublicQuotes(): Promise<QuoteItem[]> {
    const books = await this.getPublicBooks();
    const quotes: QuoteItem[] = [];
    for (const book of books) {
      if (book.quotes && Array.isArray(book.quotes)) {
        quotes.push(...book.quotes);
      }
    }
    return quotes;
  }
}

export const publicDataService = new PublicDataService();

