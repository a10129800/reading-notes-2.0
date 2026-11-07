import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Book, DashboardStats, BookStatus } from '../../types';
import { localApiService } from '../../services/localApiService';
import { ProgressBar } from '../../components/ProgressBar';
import {
  ShieldCheck,
  Plus,
  BookOpen,
  Lock,
  FileEdit,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  ExternalLink,
  Archive,
  ArrowRight,
  Layers,
  AlertTriangle,
  CheckCircle2,
  FileText
} from 'lucide-react';

/**
 * Library-style Book Cover Thumbnail for Manager Dashboard
 * Fixed 3:4 aspect ratio, rounded corners, subtle shadow, and graceful fallback
 */
const ManagerBookCover: React.FC<{ book: Book }> = ({ book }) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [book.coverImage, book.id]);

  const coverUrl = useMemo(() => {
    if (!book.coverImage) return '';
    if (book.coverImage.startsWith('http://') || book.coverImage.startsWith('https://')) {
      return book.coverImage;
    }
    return localApiService.getBookCoverApiUrl(book.id);
  }, [book.coverImage, book.id]);

  const hasImage = Boolean(coverUrl && !imageError);

  return (
    <Link
      to={`/manager/books/${book.id}`}
      className="group/cover relative w-16 sm:w-[72px] aspect-[3/4] shrink-0 rounded-lg overflow-hidden border border-academic-borderLight dark:border-academic-borderDark bg-paper-200 dark:bg-ink-900 shadow-xs flex items-center justify-center transition-transform hover:scale-105"
      title={`點擊編輯《${book.title}》`}
    >
      {hasImage ? (
        <img
          src={coverUrl}
          alt={book.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="p-1.5 text-center flex flex-col items-center justify-center w-full h-full bg-paper-100 dark:bg-ink-800/80">
          <BookOpen className="w-5 h-5 text-bronze-600 dark:text-bronze-400 opacity-60 mb-0.5 group-hover/cover:scale-110 transition-transform" />
          <span className="text-[9px] font-serif font-bold text-ink-500 dark:text-ink-400 line-clamp-2 leading-tight px-0.5">
            {book.title}
          </span>
        </div>
      )}
    </Link>
  );
};

export const ManagerDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [isServerActive, setIsServerActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'public' | 'private' | 'draft'>('all');

  // New Book Dialog state
  const [showNewBookModal, setShowNewBookModal] = useState(false);
  const [newBookId, setNewBookId] = useState('');
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookCategory, setNewBookCategory] = useState('管理學與決策');
  const [newBookStatus, setNewBookStatus] = useState<BookStatus>('draft');
  const [newBookCoreIdea, setNewBookCoreIdea] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const live = await localApiService.isLive();
    setIsServerActive(live);

    if (live) {
      try {
        const [statsData, booksData] = await Promise.all([
          localApiService.getStats(),
          localApiService.getBooks(),
        ]);
        setStats(statsData);
        setBooks(booksData);
      } catch (err) {
        console.error(err);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteBook = async (bookId: string, title: string) => {
    if (!confirm(`確定要刪除《${title}》及其所有篇章筆記嗎？本機檔案將被移除。`)) return;
    try {
      await localApiService.deleteBook(bookId);
      loadData();
    } catch (err: any) {
      alert(`刪除失敗：${err.message}`);
    }
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookId.trim() || !newBookTitle.trim()) {
      alert('請填寫書籍代號 (ID) 與書名！');
      return;
    }
    setCreating(true);
    try {
      await localApiService.saveBook({
        id: newBookId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
        title: newBookTitle.trim(),
        author: newBookAuthor.trim(),
        category: newBookCategory.trim() || '通用知識',
        status: newBookStatus,
        readingStatus: 'reading',
        progress: 0,
        motivation: '',
        introduction: '',
        coreIdea: newBookCoreIdea.trim() || '全書核心思想整理中...',
        tags: [],
        chapters: [],
        startDate: new Date().toISOString().split('T')[0],
        coverImage: '',
      });
      setShowNewBookModal(false);
      setNewBookId('');
      setNewBookTitle('');
      setNewBookAuthor('');
      setNewBookCoreIdea('');
      loadData();
    } catch (err: any) {
      alert(`建立失敗：${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const filteredBooks = books.filter(b => {
    if (activeTab === 'all') return true;
    return b.status === activeTab;
  });

  return (
    <div className="space-y-8">
      {/* Top Header & Server Status Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-academic-borderLight dark:border-academic-borderDark">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-lg bg-bronze-600 text-paper-50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="font-serif text-3xl font-extrabold text-ink-900 dark:text-ink-100">
              本機閱讀管理工作台
            </h1>
          </div>
          <p className="text-xs text-ink-500 dark:text-academic-mutedDark">
            管理本機私人筆記、草稿與發布流水線。私人內容物理隔離於公開專案目錄之外。
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/manager/publish"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-academic-navy text-paper-50 hover:bg-bronze-700 transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            發布審核流水線
          </Link>
          <Link
            to="/manager/backups"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-50 dark:bg-ink-800 text-ink-800 dark:text-ink-200 hover:bg-paper-200 transition-colors"
          >
            <Archive className="w-3.5 h-3.5 text-bronze-600" />
            備份與還原
          </Link>
          <button
            onClick={() => setShowNewBookModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-bronze-600 text-paper-50 hover:bg-bronze-700 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            新增書籍
          </button>
        </div>
      </div>

      {/* Backend Offline Notice if service not reachable */}
      {isServerActive === false && (
        <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>本機後端管理服務尚未啟動 (127.0.0.1:4000)</span>
          </div>
          <p className="text-xs leading-relaxed">
            目前工作台處於唯讀預覽模式。若要新增書籍、編輯章節或發布，請點擊根目錄的{' '}
            <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">start-manager.bat</code>{' '}
            或在終端機執行 <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">npm run server</code>。
          </p>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark">
            <span className="text-xs text-ink-500 block mb-1">全部管理書籍</span>
            <span className="font-serif text-2xl font-bold text-ink-900 dark:text-ink-100">
              {stats.totalBooks}
            </span>
            <span className="text-[10px] text-ink-400 block mt-0.5">本機總館藏庫</span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
            <span className="text-xs text-emerald-800 dark:text-emerald-300 block mb-1">公開書籍 (Public)</span>
            <span className="font-serif text-2xl font-bold text-emerald-900 dark:text-emerald-200">
              {stats.publicBooks}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5">可部署至 GitHub Pages</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/40 border border-zinc-300 dark:border-zinc-700">
            <span className="text-xs text-zinc-700 dark:text-zinc-300 block mb-1">私人書籍 (Private)</span>
            <span className="font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.privateBooks}
            </span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">本機嚴格隔離未公開</span>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
            <span className="text-xs text-amber-800 dark:text-amber-300 block mb-1">未完草稿 (Draft)</span>
            <span className="font-serif text-2xl font-bold text-amber-900 dark:text-amber-200">
              {stats.draftBooks}
            </span>
            <span className="text-[10px] text-amber-600 block mt-0.5">研讀編寫中</span>
          </div>
        </div>
      )}

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 border-b border-academic-borderLight dark:border-academic-borderDark pb-2 text-xs font-medium">
        {[
          { key: 'all', label: `全部書籍 (${books.length})` },
          { key: 'public', label: `公開 (${books.filter(b => b.status === 'public').length})` },
          { key: 'private', label: `私人 (${books.filter(b => b.status === 'private').length})` },
          { key: 'draft', label: `草稿 (${books.filter(b => b.status === 'draft').length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === t.key
                ? 'bg-bronze-600 text-paper-50 shadow-xs'
                : 'text-ink-600 dark:text-ink-400 hover:bg-paper-200 dark:hover:bg-ink-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Books Table / Grid */}
      {loading ? (
        <div className="p-16 text-center text-ink-400">載入本機工作台資料中...</div>
      ) : filteredBooks.length === 0 ? (
        <div className="p-16 text-center rounded-xl border border-dashed border-academic-borderLight dark:border-academic-borderDark text-ink-500">
          目前無任何此狀態的書籍。點擊右上角「新增書籍」開始整理。
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBooks.map(book => {
            const statusConfig = {
              public: { label: '公開 Public', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
              private: { label: '私人 Private', class: 'bg-zinc-200 text-zinc-800 border-zinc-400' },
              draft: { label: '草稿 Draft', class: 'bg-amber-100 text-amber-800 border-amber-300' },
            }[book.status];

            return (
              <div
                key={book.id}
                className="p-4 sm:p-5 rounded-xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0 w-full md:w-auto">
                  {/* Library-style Book Cover Thumbnail */}
                  <ManagerBookCover book={book} />

                  {/* Book Details */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono border font-semibold ${statusConfig.class}`}>
                        {statusConfig.label}
                      </span>
                      <span className="text-xs text-ink-400 font-mono">
                        ID: {book.id}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-paper-200 dark:bg-ink-800 text-ink-600 dark:text-ink-300">
                        {book.category}
                      </span>
                    </div>

                    <Link to={`/manager/books/${book.id}`}>
                      <h3 className="font-serif text-base sm:text-lg font-bold text-ink-900 dark:text-ink-100 hover:text-bronze-600 dark:group-hover:text-bronze-400 transition-colors line-clamp-1" title={book.title}>
                        {book.title}
                      </h3>
                    </Link>

                    <p className="text-xs text-ink-600 dark:text-academic-mutedDark">
                      作者：{book.author} · 章節數：{book.chapters?.length || 0} · 閱讀進度：{book.progress}%
                    </p>

                    {/* Mini Progress Bar */}
                    <div className="max-w-xs pt-0.5">
                      <ProgressBar progress={book.progress} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Action button row */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
                  <a
                    href={localApiService.getExportMarkdownUrl(book.id)}
                    download
                    className="p-2 rounded-lg border border-academic-borderLight dark:border-academic-borderDark hover:bg-paper-200 text-ink-600 hover:text-ink-900 transition-colors"
                    title="匯出全書 Markdown 筆記"
                  >
                    <Download className="w-4 h-4" />
                  </a>

                  <Link
                    to={`/manager/books/${book.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-xs font-semibold text-ink-800 dark:text-ink-200 hover:bg-paper-200 transition-colors"
                  >
                    <FileEdit className="w-3.5 h-3.5 text-bronze-600" />
                    編輯內容與章節
                  </Link>

                  <button
                    onClick={() => handleDeleteBook(book.id, book.title)}
                    className="p-2 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="刪除此書籍"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Book Modal */}
      {showNewBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-paper-50 dark:bg-academic-cardDark rounded-2xl border border-academic-borderLight dark:border-academic-borderDark p-6 w-full max-w-lg shadow-xl space-y-4">
            <h2 className="font-serif text-xl font-bold text-ink-900 dark:text-ink-100">
              新增研讀書籍
            </h2>

            <form onSubmit={handleCreateBook} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">
                  書籍 ID 代號 (英文/數字/破折號，例如：thinking-in-systems) *
                </label>
                <input
                  type="text"
                  required
                  value={newBookId}
                  onChange={e => setNewBookId(e.target.value)}
                  placeholder="thinking-fast-and-slow"
                  className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">
                  書名 *
                </label>
                <input
                  type="text"
                  required
                  value={newBookTitle}
                  onChange={e => setNewBookTitle(e.target.value)}
                  placeholder="快思慢想"
                  className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">
                    作者
                  </label>
                  <input
                    type="text"
                    value={newBookAuthor}
                    onChange={e => setNewBookAuthor(e.target.value)}
                    placeholder="丹尼爾·康納曼"
                    className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
                  />
                </div>

                <div>
                  <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">
                    分類領域
                  </label>
                  <input
                    type="text"
                    value={newBookCategory}
                    onChange={e => setNewBookCategory(e.target.value)}
                    placeholder="行為心理學"
                    className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">
                  權限狀態 (Status)
                </label>
                <select
                  value={newBookStatus}
                  onChange={e => setNewBookStatus(e.target.value as BookStatus)}
                  className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
                >
                  <option value="draft">草稿 Draft (僅本機儲存)</option>
                  <option value="private">私人 Private (本機保密，永不公開)</option>
                  <option value="public">公開 Public (可白名單發布至 GitHub Pages)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">
                  全書核心思想初稿
                </label>
                <textarea
                  rows={2}
                  value={newBookCoreIdea}
                  onChange={e => setNewBookCoreIdea(e.target.value)}
                  placeholder="作者試圖傳達的核心論點或心智模型..."
                  className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-academic-borderLight dark:border-academic-borderDark">
                <button
                  type="button"
                  onClick={() => setShowNewBookModal(false)}
                  className="px-4 py-2 rounded-lg border border-academic-borderLight dark:border-academic-borderDark text-ink-600 hover:bg-paper-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-lg bg-bronze-600 text-paper-50 font-bold hover:bg-bronze-700 shadow-sm"
                >
                  {creating ? '建立中...' : '確認新增書籍'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

