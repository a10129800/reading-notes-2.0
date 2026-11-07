import React from 'react';
import { Link } from 'react-router-dom';
import { Book as BookType } from '../types';
import { ProgressBar } from './ProgressBar';
import { BookOpen, Calendar, CheckCircle2, Clock, Bookmark } from 'lucide-react';
import { resolveCoverUrl } from '../utils/url';

interface BookCardProps {
  book: BookType;
  showStatusBadge?: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({ book, showStatusBadge = false }) => {
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [book.coverImage, book.id]);

  const coverUrl = resolveCoverUrl(book.coverImage, book.id);
  const shouldShowImage = Boolean(coverUrl && !imageError);

  const readingStateLabels = {
    unread: { label: '未讀', class: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
    reading: { label: '閱讀中', class: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
    completed: { label: '已讀完', class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
    abandoned: { label: '已擱置', class: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' },
  }[book.readingStatus] || { label: '未知', class: 'bg-zinc-100 text-zinc-600' };

  const statusBadge = {
    public: { label: '公開 Public', class: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
    private: { label: '私人 Private', class: 'bg-zinc-100 text-zinc-700 border-zinc-300' },
    draft: { label: '草稿 Draft', class: 'bg-amber-50 text-amber-700 border-amber-300' },
  }[book.status];

  return (
    <div className="group flex flex-col bg-paper-50 dark:bg-academic-cardDark rounded-lg border border-academic-borderLight dark:border-academic-borderDark overflow-hidden hover:shadow-md transition-all duration-200">
      <div className="flex flex-col sm:flex-row h-full">
        {/* Book Cover */}
        <Link
          to={`/books/${book.id}`}
          className="relative w-full sm:w-44 h-56 sm:h-auto shrink-0 bg-paper-200 dark:bg-ink-800 overflow-hidden flex items-center justify-center"
        >
          {shouldShowImage ? (
            <img
              src={coverUrl}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="p-4 text-center flex flex-col items-center justify-center w-full h-full">
              <BookOpen className="w-10 h-10 text-bronze-600 dark:text-bronze-400 mx-auto mb-2 opacity-60" />
              <span className="font-serif text-xs font-bold text-ink-600 dark:text-ink-300 line-clamp-2">
                {book.title}
              </span>
            </div>
          )}

          {/* Reading State floating badge */}
          <span className={`absolute top-2 left-2 px-2 py-0.5 text-[11px] font-medium rounded shadow-sm ${readingStateLabels.class}`}>
            {readingStateLabels.label}
          </span>

          {showStatusBadge && statusBadge && (
            <span className={`absolute bottom-2 left-2 px-1.5 py-0.5 text-[10px] font-mono border rounded ${statusBadge.class}`}>
              {statusBadge.label}
            </span>
          )}
        </Link>

        {/* Content details */}
        <div className="p-5 flex flex-col justify-between flex-1">
          <div>
            {/* Category & Tags */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className="text-[11px] font-medium text-bronze-700 dark:text-bronze-300 bg-bronze-50 dark:bg-bronze-950/60 px-2 py-0.5 rounded">
                {book.category}
              </span>
              {book.tags?.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] text-ink-500 dark:text-academic-mutedDark bg-paper-200 dark:bg-ink-800/80 px-1.5 py-0.5 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Title */}
            <Link to={`/books/${book.id}`}>
              <h3 className="font-serif text-lg font-bold text-ink-900 dark:text-ink-100 group-hover:text-bronze-700 dark:group-hover:text-bronze-400 transition-colors line-clamp-1">
                {book.title}
              </h3>
            </Link>

            {book.subtitle && (
              <p className="text-xs text-ink-500 dark:text-academic-mutedDark line-clamp-1 mb-2 font-serif italic">
                {book.subtitle}
              </p>
            )}

            {/* Author & Publisher */}
            <p className="text-xs text-ink-600 dark:text-ink-400 mb-3">
              <span className="font-medium text-ink-800 dark:text-ink-200">{book.author}</span>
              {book.publisher && <span className="opacity-70"> · {book.publisher}</span>}
            </p>

            {/* Core Idea snippet */}
            {book.coreIdea && (
              <p className="text-xs text-ink-600 dark:text-academic-mutedDark line-clamp-2 bg-paper-100 dark:bg-ink-800/40 p-2.5 rounded border-l-2 border-bronze-400 mb-3 italic">
                「{book.coreIdea}」
              </p>
            )}
          </div>

          <div>
            {/* Reading progress */}
            <div className="mb-3">
              <ProgressBar progress={book.progress} size="sm" />
            </div>

            {/* Meta row */}
            <div className="flex items-center justify-between text-[11px] text-ink-500 dark:text-academic-mutedDark pt-2 border-t border-academic-borderLight dark:border-academic-borderDark">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Bookmark className="w-3.5 h-3.5 text-bronze-600" />
                  {book.chapters?.length || 0} 章節
                </span>
                {book.quotes && book.quotes.length > 0 && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {book.quotes.length} 金句
                  </span>
                )}
              </div>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {book.startDate}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

