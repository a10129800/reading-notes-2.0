import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Book, QuoteItem } from '../types';
import { publicDataService } from '../services/publicDataService';
import { BookCard } from '../components/BookCard';
import { BookOpen, BookmarkCheck, Sparkles, Compass, ArrowRight, Quote, FolderGit2 } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      publicDataService.getPublicBooks(),
      publicDataService.getAllPublicQuotes(),
    ]).then(([fetchedBooks, fetchedQuotes]) => {
      if (mounted) {
        setBooks(fetchedBooks);
        setQuotes(fetchedQuotes);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const totalChapters = books.reduce((acc, b) => acc + (b.chapters?.length || 0), 0);
  const completedBooks = books.filter(b => b.readingStatus === 'completed').length;
  const categories = Array.from(new Set(books.map(b => b.category)));

  return (
    <div className="space-y-12">
      {/* Editorial Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-paper-100 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark p-8 sm:p-12">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-bronze-100 dark:bg-bronze-950/60 text-bronze-800 dark:text-bronze-300 mb-4 border border-bronze-300 dark:border-bronze-800">
            <Sparkles className="w-3.5 h-3.5" />
            Modern Editorial + Academic Knowledge Library
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-extrabold text-ink-950 dark:text-ink-50 leading-tight mb-4">
            深入閱讀，<br className="hidden sm:inline" />
            <span className="text-bronze-600 dark:text-bronze-400">結構化內化</span>每一本書的智慧。
          </h1>
          <p className="text-base sm:text-lg text-ink-600 dark:text-academic-mutedDark leading-relaxed mb-6 font-serif">
            這不是走馬看花的摘錄，而是嚴格保留原書章節架構、落實「導讀、摘要、專業定義、白話拆解、案例辨析、重點、心得、總結」八步深度研讀的個人知識庫。
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/books"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-academic-navy dark:bg-bronze-600 text-paper-50 hover:bg-bronze-700 transition-colors font-medium text-sm shadow-sm"
            >
              <BookOpen className="w-4 h-4" />
              瀏覽全部公開書目
            </Link>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-50 dark:bg-ink-800 text-ink-800 dark:text-ink-200 hover:bg-paper-200 transition-colors font-medium text-sm"
            >
              <Compass className="w-4 h-4 text-bronze-600" />
              全文檢索
            </Link>
          </div>
        </div>

        {/* Decorative corner background motif */}
        <div className="absolute -right-8 -bottom-10 opacity-5 pointer-events-none select-none font-serif text-[180px] font-black text-ink-900 dark:text-paper-100">
          讀
        </div>
      </section>

      {/* Public Dashboard Statistics */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark shadow-sm">
          <div className="flex items-center justify-between text-ink-500 dark:text-academic-mutedDark text-xs mb-2">
            <span>公開館藏</span>
            <BookOpen className="w-4 h-4 text-bronze-600" />
          </div>
          <div className="font-serif text-3xl font-bold text-ink-900 dark:text-ink-100">
            {books.length}
          </div>
          <div className="text-[11px] text-ink-400 mt-1">經審核公開書目</div>
        </div>

        <div className="p-5 rounded-xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark shadow-sm">
          <div className="flex items-center justify-between text-ink-500 dark:text-academic-mutedDark text-xs mb-2">
            <span>精讀章節</span>
            <BookmarkCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-serif text-3xl font-bold text-ink-900 dark:text-ink-100">
            {totalChapters}
          </div>
          <div className="text-[11px] text-ink-400 mt-1">8 步完整筆記篇數</div>
        </div>

        <div className="p-5 rounded-xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark shadow-sm">
          <div className="flex items-center justify-between text-ink-500 dark:text-academic-mutedDark text-xs mb-2">
            <span>已通讀書籍</span>
            <FolderGit2 className="w-4 h-4 text-academic-navy dark:text-academic-navyLight" />
          </div>
          <div className="font-serif text-3xl font-bold text-ink-900 dark:text-ink-100">
            {completedBooks}
          </div>
          <div className="text-[11px] text-ink-400 mt-1">已完整消化</div>
        </div>

        <div className="p-5 rounded-xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark shadow-sm">
          <div className="flex items-center justify-between text-ink-500 dark:text-academic-mutedDark text-xs mb-2">
            <span>核心金句</span>
            <Quote className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-serif text-3xl font-bold text-ink-900 dark:text-ink-100">
            {quotes.length}
          </div>
          <div className="text-[11px] text-ink-400 mt-1">標註頁碼之關鍵摘錄</div>
        </div>
      </section>

      {/* Featured Book / Recent Readings */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink-900 dark:text-ink-100">
              館藏書目精選
            </h2>
            <p className="text-xs text-ink-500 dark:text-academic-mutedDark mt-0.5">
              點擊即可查閱原書架構與章節詳細筆記
            </p>
          </div>
          <Link
            to="/books"
            className="inline-flex items-center gap-1 text-sm font-medium text-bronze-700 dark:text-bronze-400 hover:underline"
          >
            檢視全部 ({books.length})
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-ink-400">載入公開書目中...</div>
        ) : books.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-academic-borderLight dark:border-academic-borderDark text-ink-500">
            目前尚無公開書籍。可啟動本機管理器新增並發布書籍。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {books.slice(0, 4).map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>

      {/* Featured Quotes Gallery */}
      {quotes.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-ink-900 dark:text-ink-100 flex items-center gap-2">
                <Quote className="w-5 h-5 text-bronze-600" />
                思想金句萃選
              </h2>
              <p className="text-xs text-ink-500 dark:text-academic-mutedDark mt-0.5">
                原書精確頁碼引述與批判性思維註記
              </p>
            </div>
            <Link
              to="/knowledge"
              className="inline-flex items-center gap-1 text-sm font-medium text-bronze-700 dark:text-bronze-400 hover:underline"
            >
              全部金句與知識關聯
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quotes.slice(0, 4).map(q => (
              <div
                key={q.id}
                className="p-6 rounded-xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark relative flex flex-col justify-between"
              >
                <div>
                  <Quote className="w-6 h-6 text-bronze-400/40 mb-2" />
                  <blockquote className="font-serif text-base font-semibold text-ink-900 dark:text-ink-100 leading-relaxed italic mb-3">
                    「{q.quote}」
                  </blockquote>
                  {q.note && (
                    <p className="text-xs text-ink-600 dark:text-academic-mutedDark mb-4 leading-relaxed">
                      💡 {q.note}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-ink-500 dark:text-zinc-400 pt-3 border-t border-academic-borderLight dark:border-academic-borderDark">
                  <span>{q.sourceChapterTitle || '書籍引言'}</span>
                  <span className="font-mono text-bronze-700 dark:text-bronze-400 font-semibold">{q.page}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Category Overview */}
      {categories.length > 0 && (
        <section className="p-6 rounded-xl bg-paper-100/60 dark:bg-academic-cardDark/50 border border-academic-borderLight dark:border-academic-borderDark">
          <h3 className="font-serif text-lg font-bold text-ink-900 dark:text-ink-100 mb-3">
            學術與主題領域分類
          </h3>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => {
              const count = books.filter(b => b.category === cat).length;
              return (
                <Link
                  key={cat}
                  to={`/books?category=${encodeURIComponent(cat)}`}
                  className="px-3 py-1.5 rounded-lg bg-paper-50 dark:bg-ink-800 border border-academic-borderLight dark:border-academic-borderDark text-xs font-medium text-ink-700 dark:text-ink-200 hover:border-bronze-400 transition-colors flex items-center gap-2"
                >
                  <span>{cat}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-paper-200 dark:bg-ink-700 text-[10px] font-mono text-ink-500">
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
