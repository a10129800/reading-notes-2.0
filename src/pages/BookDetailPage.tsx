import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Book } from '../types';
import { publicDataService } from '../services/publicDataService';
import { ProgressBar } from '../components/ProgressBar';
import { resolveCoverUrl } from '../utils/url';
import {
  BookOpen,
  Calendar,
  Layers,
  Quote,
  Share2,
  Check,
  ChevronRight,
  ArrowLeft,
  Clock,
  Sparkles,
  BookMarked
} from 'lucide-react';

export const BookDetailPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!bookId) return;
    let mounted = true;
    publicDataService.getBook(bookId).then(data => {
      if (mounted) {
        setBook(data);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [bookId]);

  if (loading) {
    return <div className="p-20 text-center text-ink-400">載入書籍詳情中...</div>;
  }

  if (!book) {
    return (
      <div className="p-16 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold">找不到此書籍或該書籍為非公開狀態</h2>
        <p className="text-ink-500 text-sm">請確認網址是否正確，或返回書庫首頁。</p>
        <Link
          to="/books"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-academic-navy text-paper-50 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> 返回書目清單
        </Link>
      </div>
    );
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const readingStateLabels = {
    unread: '未讀 (Unread)',
    reading: '研讀中 (Reading)',
    completed: '已精讀完成 (Completed)',
    abandoned: '暫時擱置 (Abandoned)',
  }[book.readingStatus];

  return (
    <div className="space-y-10">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/books')}
          className="inline-flex items-center gap-1.5 text-xs text-ink-500 dark:text-academic-mutedDark hover:text-ink-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 返回館藏書目
        </button>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-academic-borderLight dark:border-academic-borderDark bg-paper-50 dark:bg-ink-800 text-ink-700 dark:text-ink-200 hover:bg-paper-200 transition-colors"
          title="複製本書分享網址"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" /> 已複製網址
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-bronze-600" /> 分享本書
            </>
          )}
        </button>
      </div>

      {/* Book Master Header Section */}
      <section className="bg-paper-50 dark:bg-academic-cardDark p-6 sm:p-8 rounded-2xl border border-academic-borderLight dark:border-academic-borderDark shadow-sm flex flex-col md:flex-row gap-8">
        {/* Cover */}
        <div className="w-full sm:w-56 shrink-0 bg-paper-200 dark:bg-ink-800 rounded-lg overflow-hidden shadow-md flex items-center justify-center">
          {book.coverImage ? (
            <img
              src={resolveCoverUrl(book.coverImage)}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="p-8 text-center">
              <BookOpen className="w-12 h-12 text-bronze-600 mx-auto mb-2 opacity-60" />
              <span className="font-serif text-sm font-bold text-ink-600 line-clamp-3">
                {book.title}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-bronze-100 dark:bg-bronze-950/60 text-bronze-800 dark:text-bronze-300">
                {book.category}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-paper-200 dark:bg-ink-800 text-ink-600 dark:text-ink-400">
                {readingStateLabels}
              </span>
              {book.tags?.map(tag => (
                <span
                  key={tag}
                  className="text-xs text-ink-500 dark:text-academic-mutedDark bg-paper-100 dark:bg-ink-800/80 px-2 py-0.5 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <h1 className="font-serif text-2xl sm:text-4xl font-extrabold text-ink-950 dark:text-ink-50 leading-tight">
              {book.title}
            </h1>
            {book.subtitle && (
              <p className="font-serif italic text-sm sm:text-base text-ink-500 dark:text-academic-mutedDark mt-1">
                {book.subtitle}
              </p>
            )}

            {/* Publishing details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 text-xs text-ink-600 dark:text-ink-400 mt-4 pt-4 border-t border-academic-borderLight dark:border-academic-borderDark">
              <div>
                <span className="text-ink-400 block">作者：</span>
                <span className="font-medium text-ink-900 dark:text-ink-100">{book.author}</span>
              </div>
              <div>
                <span className="text-ink-400 block">出版社：</span>
                <span className="font-medium text-ink-900 dark:text-ink-100">{book.publisher || '未填寫'}</span>
              </div>
              <div>
                <span className="text-ink-400 block">出版日期：</span>
                <span className="font-medium text-ink-900 dark:text-ink-100">{book.publishDate || '未填寫'}</span>
              </div>
              <div>
                <span className="text-ink-400 block">ISBN：</span>
                <span className="font-mono text-ink-900 dark:text-ink-100">{book.isbn || 'N/A'}</span>
              </div>
              <div>
                <span className="text-ink-400 block">研讀期間：</span>
                <span className="font-medium text-ink-900 dark:text-ink-100">
                  {book.startDate} {book.finishDate ? `~ ${book.finishDate}` : '(研讀中)'}
                </span>
              </div>
              <div>
                <span className="text-ink-400 block">篇章統計：</span>
                <span className="font-medium text-ink-900 dark:text-ink-100">
                  {book.chapters?.length || 0} 章節 · {book.quotes?.length || 0} 則金句
                </span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="pt-2">
            <ProgressBar progress={book.progress} size="md" />
          </div>
        </div>
      </section>

      {/* Core Idea & Motivation Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Idea */}
        <div className="p-6 rounded-xl bg-paper-50 dark:bg-academic-cardDark border-l-4 border-bronze-500 border-t border-r border-b border-academic-borderLight dark:border-academic-borderDark shadow-sm">
          <div className="flex items-center gap-2 text-bronze-700 dark:text-bronze-400 font-serif font-bold text-sm mb-2">
            <Sparkles className="w-4 h-4" />
            全書核心思想 (Core Thesis)
          </div>
          <p className="font-serif text-base text-ink-900 dark:text-ink-100 leading-relaxed italic">
            「{book.coreIdea}」
          </p>
        </div>

        {/* Motivation */}
        <div className="p-6 rounded-xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark shadow-sm">
          <div className="flex items-center gap-2 text-academic-navy dark:text-academic-navyLight font-serif font-bold text-sm mb-2">
            <BookMarked className="w-4 h-4" />
            研讀動機 (Reading Motivation)
          </div>
          <p className="text-sm text-ink-600 dark:text-academic-mutedDark leading-relaxed">
            {book.motivation || '暫無研讀動機說明。'}
          </p>
        </div>
      </div>

      {/* Book Introduction */}
      {book.introduction && (
        <section className="bg-paper-50 dark:bg-academic-cardDark p-6 sm:p-8 rounded-xl border border-academic-borderLight dark:border-academic-borderDark shadow-sm">
          <h2 className="font-serif text-lg font-bold text-ink-900 dark:text-ink-100 mb-3">
            書籍導讀與背景介紹
          </h2>
          <div className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed whitespace-pre-line">
            {book.introduction}
          </div>
        </section>
      )}

      {/* Table of Contents / Chapter List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink-900 dark:text-ink-100 flex items-center gap-2">
              <Layers className="w-6 h-6 text-bronze-600" />
              原書章節目錄與 8 步筆記
            </h2>
            <p className="text-xs text-ink-500 dark:text-academic-mutedDark mt-0.5">
              嚴格保留原書目錄層級與順序，點擊任一篇章即可開啟三欄式閱讀介面。
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {(!book.chapters || book.chapters.length === 0) ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-academic-borderLight dark:border-academic-borderDark text-ink-400">
              本書尚未建立任何章節。
            </div>
          ) : (
            book.chapters.map((ch, idx) => (
              <Link
                key={ch.id}
                to={`/books/${book.id}/${ch.id}`}
                className="group flex items-center justify-between p-4 sm:p-5 rounded-xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark hover:border-bronze-500 dark:hover:border-bronze-500 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-paper-200 dark:bg-ink-800 text-bronze-700 dark:text-bronze-400 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-ink-900 dark:text-ink-100 group-hover:text-bronze-700 dark:group-hover:text-bronze-400 transition-colors">
                      {ch.title}
                    </h3>
                    {ch.subtitle && (
                      <p className="text-xs text-ink-500 dark:text-academic-mutedDark mt-0.5">
                        {ch.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-xs text-ink-500 dark:text-academic-mutedDark">
                  {ch.readingTimeMinutes && (
                    <span className="hidden sm:inline-flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {ch.readingTimeMinutes} 分鐘
                    </span>
                  )}
                  {ch.completed && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                      已精讀
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-ink-400 group-hover:text-bronze-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Book Level Quotes */}
      {book.quotes && book.quotes.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-serif text-xl font-bold text-ink-900 dark:text-ink-100 flex items-center gap-2">
            <Quote className="w-5 h-5 text-bronze-600" />
            本書精選金句 ({book.quotes.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {book.quotes.map(q => (
              <div
                key={q.id}
                className="p-5 rounded-xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark flex flex-col justify-between"
              >
                <div>
                  <blockquote className="font-serif text-sm font-semibold text-ink-900 dark:text-ink-100 leading-relaxed italic mb-2">
                    「{q.quote}」
                  </blockquote>
                  {q.note && (
                    <p className="text-xs text-ink-600 dark:text-academic-mutedDark leading-relaxed">
                      💡 {q.note}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-ink-500 pt-3 border-t border-academic-borderLight dark:border-academic-borderDark mt-3">
                  <span>{q.sourceChapterTitle || '書籍引言'}</span>
                  <span className="font-mono text-bronze-700 dark:text-bronze-400 font-semibold">{q.page}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

