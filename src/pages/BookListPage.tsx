import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Book } from '../types';
import { publicDataService } from '../services/publicDataService';
import { BookCard } from '../components/BookCard';
import { Search, Filter, SlidersHorizontal, BookOpen } from 'lucide-react';

export const BookListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'ALL');
  const [sortBy, setSortBy] = useState<'updated' | 'progress' | 'title'>('updated');

  useEffect(() => {
    let mounted = true;
    publicDataService.getPublicBooks().then(res => {
      if (mounted) {
        setBooks(res);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const categories = ['ALL', ...Array.from(new Set(books.map(b => b.category)))];

  const filteredBooks = books.filter(book => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = book.title.toLowerCase().includes(q);
      const matchAuthor = book.author.toLowerCase().includes(q);
      const matchCore = book.coreIdea.toLowerCase().includes(q);
      const matchTag = book.tags?.some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchAuthor && !matchCore && !matchTag) return false;
    }

    // Category match
    if (selectedCategory !== 'ALL' && book.category !== selectedCategory) {
      return false;
    }

    // Reading status match
    if (selectedStatus !== 'ALL' && book.readingStatus !== selectedStatus) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'progress') return b.progress - a.progress;
    if (sortBy === 'title') return a.title.localeCompare(b.title, 'zh-TW');
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    if (cat === 'ALL') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', cat);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-serif text-3xl font-extrabold text-ink-900 dark:text-ink-100 flex items-center gap-2.5">
          <BookOpen className="w-8 h-8 text-bronze-600" />
          書籍館藏總覽
        </h1>
        <p className="text-sm text-ink-600 dark:text-academic-mutedDark mt-1">
          完整檢視所有已公開之精讀書籍，支援分類、進度篩選與標題查詢。
        </p>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-paper-50 dark:bg-academic-cardDark p-4 sm:p-5 rounded-xl border border-academic-borderLight dark:border-academic-borderDark shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜尋書名、作者、核心思想或標籤..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-bronze-500"
            />
          </div>

          {/* Reading State Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              aria-label="閱讀狀態篩選"
              className="px-3 py-2 text-sm rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-800 dark:text-ink-200 focus:outline-none focus:ring-2 focus:ring-bronze-500"
            >
              <option value="ALL">全部閱讀狀態</option>
              <option value="completed">已讀完 (Completed)</option>
              <option value="reading">研讀中 (Reading)</option>
              <option value="unread">待讀 (Unread)</option>
              <option value="abandoned">已擱置 (Abandoned)</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              aria-label="書籍排序依據"
              className="px-3 py-2 text-sm rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-800 dark:text-ink-200 focus:outline-none focus:ring-2 focus:ring-bronze-500"
            >
              <option value="updated">最新更新</option>
              <option value="progress">閱讀進度高至低</option>
              <option value="title">書名字母排序</option>
            </select>
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-academic-borderLight dark:border-academic-borderDark">
          <span className="text-xs text-ink-500 dark:text-academic-mutedDark flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> 分類：
          </span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-bronze-600 text-paper-50 shadow-xs'
                  : 'bg-paper-200 dark:bg-ink-800 text-ink-600 dark:text-ink-300 hover:bg-paper-300'
              }`}
            >
              {cat === 'ALL' ? '全部分類' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-ink-500 dark:text-academic-mutedDark">
        <span>共計 {filteredBooks.length} 本書籍符合篩選條件</span>
        {(searchQuery || selectedCategory !== 'ALL' || selectedStatus !== 'ALL') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedStatus('ALL');
              setSearchParams({});
            }}
            className="text-bronze-700 dark:text-bronze-400 hover:underline"
          >
            重置所有篩選
          </button>
        )}
      </div>

      {/* Book Grid */}
      {loading ? (
        <div className="p-16 text-center text-ink-400">載入館藏書目中...</div>
      ) : filteredBooks.length === 0 ? (
        <div className="p-16 text-center rounded-xl border border-dashed border-academic-borderLight dark:border-academic-borderDark text-ink-500">
          找不到符合條件的書籍。
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBooks.map(book => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
};

