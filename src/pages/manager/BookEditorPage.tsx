import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Book, ChapterMeta, BookStatus, ReadingState } from '../../types';
import { localApiService } from '../../services/localApiService';
import { createDefaultChapterSections } from '../../utils/template';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileEdit,
  Download,
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  RefreshCw,
  AlertCircle,
  X
} from 'lucide-react';

export const BookEditorPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // New chapter modal
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [newChId, setNewChId] = useState('');
  const [newChTitle, setNewChTitle] = useState('');
  const [newChSubtitle, setNewChSubtitle] = useState('');
  const [newChTime, setNewChTime] = useState(15);

  // Book Cover Management state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coverMode, setCoverMode] = useState<'local' | 'url'>('local');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const [coverTimestamp, setCoverTimestamp] = useState<number>(Date.now());
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverSuccess, setCoverSuccess] = useState<string | null>(null);

  // Sync initial cover mode based on existing cover
  useEffect(() => {
    if (book?.coverImage) {
      if (book.coverImage.startsWith('http://') || book.coverImage.startsWith('https://')) {
        setCoverMode('url');
      } else {
        setCoverMode('local');
      }
    }
  }, [book?.coverImage]);

  // Cleanup object URL on unmount or change
  useEffect(() => {
    return () => {
      if (selectedFilePreview && selectedFilePreview.startsWith('blob:')) {
        URL.revokeObjectURL(selectedFilePreview);
      }
    };
  }, [selectedFilePreview]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCoverError(null);
    setCoverSuccess(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['jpg', 'jpeg', 'png', 'webp'];

    if (!ext || !validExts.includes(ext)) {
      setCoverError('不支援的檔案格式，僅允許 JPG, JPEG, PNG, WebP。');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setCoverError(`檔案大小超過 5MB 上限 (${(file.size / (1024 * 1024)).toFixed(2)} MB)，請壓縮後再選取。`);
      e.target.value = '';
      return;
    }

    if (selectedFilePreview && selectedFilePreview.startsWith('blob:')) {
      URL.revokeObjectURL(selectedFilePreview);
    }

    const preview = URL.createObjectURL(file);
    setSelectedFile(file);
    setSelectedFilePreview(preview);
    setCoverSuccess(`已選取「${file.name}」(${(file.size / 1024).toFixed(1)} KB)，點擊「確認儲存封面」上傳。`);
    e.target.value = '';
  };

  const handleCancelSelectedFile = () => {
    if (selectedFilePreview && selectedFilePreview.startsWith('blob:')) {
      URL.revokeObjectURL(selectedFilePreview);
    }
    setSelectedFile(null);
    setSelectedFilePreview(null);
    setCoverError(null);
    setCoverSuccess(null);
  };

  const handleUploadCover = async () => {
    if (!book || !selectedFile) return;
    setUploadingCover(true);
    setCoverError(null);
    setCoverSuccess(null);
    try {
      const res = await localApiService.uploadBookCover(book.id, selectedFile);
      setBook({ ...book, coverImage: res.coverImage });
      setCoverTimestamp(Date.now());
      if (selectedFilePreview && selectedFilePreview.startsWith('blob:')) {
        URL.revokeObjectURL(selectedFilePreview);
      }
      setSelectedFile(null);
      setSelectedFilePreview(null);
      setCoverSuccess('本機封面已成功儲存！若此書為公開狀態，一鍵發布時將同步至 GitHub Pages。');
    } catch (err: any) {
      setCoverError(`上傳失敗：${err.message}`);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleDeleteCover = async () => {
    if (!book) return;
    if (!confirm('確定要移除此書籍的封面嗎？將還原為系統預設封面。')) return;
    setUploadingCover(true);
    setCoverError(null);
    setCoverSuccess(null);
    try {
      await localApiService.deleteBookCover(book.id);
      if (selectedFilePreview && selectedFilePreview.startsWith('blob:')) {
        URL.revokeObjectURL(selectedFilePreview);
      }
      setSelectedFile(null);
      setSelectedFilePreview(null);
      setBook({ ...book, coverImage: '' });
      setCoverTimestamp(Date.now());
      setCoverSuccess('封面已成功移除，現使用系統預設封面。');
    } catch (err: any) {
      setCoverError(`移除失敗：${err.message}`);
    } finally {
      setUploadingCover(false);
    }
  };

  useEffect(() => {
    if (!bookId) return;
    localApiService.getBook(bookId).then(data => {
      setBook(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [bookId]);

  if (loading) return <div className="p-20 text-center text-ink-400">載入中...</div>;
  if (!book) return <div className="p-20 text-center text-ink-400">找不到此書籍資料</div>;

  const handleSaveBook = async () => {
    if (!book) return;
    setSaving(true);
    try {
      const updated = await localApiService.saveBook(book);
      setBook(updated);
      alert('書籍資料儲存成功！');
    } catch (err: any) {
      alert(`儲存失敗：${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const currentTags = book.tags || [];
    if (!currentTags.includes(tagInput.trim())) {
      setBook({ ...book, tags: [...currentTags, tagInput.trim()] });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setBook({ ...book, tags: (book.tags || []).filter(t => t !== tag) });
  };

  const handleMoveChapter = async (index: number, direction: 'up' | 'down') => {
    if (!book || !book.chapters) return;
    const chapters = [...book.chapters];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= chapters.length) return;

    // Swap
    const temp = chapters[index];
    chapters[index] = chapters[targetIdx];
    chapters[targetIdx] = temp;

    const chapterIds = chapters.map(c => c.id);
    try {
      const updated = await localApiService.reorderChapters(book.id, chapterIds);
      setBook(updated);
    } catch (err: any) {
      alert(`排序更新失敗：${err.message}`);
    }
  };

  const handleDeleteChapter = async (chId: string, title: string) => {
    if (!confirm(`確定要刪除「${title}」章節筆記嗎？`)) return;
    try {
      await localApiService.deleteChapter(book.id, chId);
      const updated = await localApiService.getBook(book.id);
      setBook(updated);
    } catch (err: any) {
      alert(`刪除失敗：${err.message}`);
    }
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChId.trim() || !newChTitle.trim()) {
      alert('請填寫章節 ID 與篇章標題！');
      return;
    }

    try {
      const cleanChId = newChId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const defaultSections = createDefaultChapterSections(newChTitle.trim());

      await localApiService.saveChapter(book.id, {
        id: cleanChId,
        bookId: book.id,
        order: (book.chapters?.length || 0) + 1,
        title: newChTitle.trim(),
        subtitle: newChSubtitle.trim() || undefined,
        completed: false,
        readingTimeMinutes: newChTime || 15,
        sections: defaultSections,
        quotes: [],
        relatedLinks: [],
      });

      setShowAddChapterModal(false);
      setNewChId('');
      setNewChTitle('');
      setNewChSubtitle('');

      // Reload
      const updated = await localApiService.getBook(book.id);
      setBook(updated);
    } catch (err: any) {
      alert(`建立章節失敗：${err.message}`);
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-academic-borderLight dark:border-academic-borderDark">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/manager')}
            className="p-2 rounded-lg border border-academic-borderLight dark:border-academic-borderDark hover:bg-paper-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-ink-900 dark:text-ink-100">
              編輯書籍：《{book.title}》
            </h1>
            <p className="text-xs text-ink-400 font-mono">ID: {book.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {book.status === 'public' && (
            <Link
              to={`/books/${book.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-academic-borderLight dark:border-academic-borderDark hover:bg-paper-200 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-bronze-600" />
              公開預覽
            </Link>
          )}

          <a
            href={localApiService.getExportMarkdownUrl(book.id)}
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-academic-borderLight dark:border-academic-borderDark hover:bg-paper-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            匯出 Markdown
          </a>

          <button
            onClick={handleSaveBook}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-bronze-600 text-paper-50 hover:bg-bronze-700 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? '儲存中...' : '儲存書籍設定'}
          </button>
        </div>
      </div>

      {/* Book Metadata Form */}
      <div className="p-6 rounded-2xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark shadow-xs space-y-6">
        <h2 className="font-serif text-lg font-bold text-ink-900 dark:text-ink-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-bronze-600" />
          書籍基本資料設定
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">書名 *</label>
            <input
              type="text"
              value={book.title}
              onChange={e => setBook({ ...book, title: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
            />
          </div>

          <div>
            <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">副標題</label>
            <input
              type="text"
              value={book.subtitle || ''}
              onChange={e => setBook({ ...book, subtitle: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
            />
          </div>

          <div>
            <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">作者</label>
            <input
              type="text"
              value={book.author}
              onChange={e => setBook({ ...book, author: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
            />
          </div>

          <div>
            <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">出版社</label>
            <input
              type="text"
              value={book.publisher}
              onChange={e => setBook({ ...book, publisher: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
            />
          </div>

          <div>
            <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">出版日期</label>
            <input
              type="text"
              value={book.publishDate}
              onChange={e => setBook({ ...book, publishDate: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
            />
          </div>

          <div>
            <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">ISBN</label>
            <input
              type="text"
              value={book.isbn}
              onChange={e => setBook({ ...book, isbn: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">分類領域</label>
            <input
              type="text"
              value={book.category}
              onChange={e => setBook({ ...book, category: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
            />
          </div>

          {/* Cover Management Section */}
          <div className="p-4 rounded-xl bg-paper-100/70 dark:bg-ink-800/60 border border-academic-borderLight dark:border-academic-borderDark space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-academic-borderLight/60 dark:border-academic-borderDark/60 pb-3">
              <div>
                <label className="font-bold text-ink-900 dark:text-ink-100 flex items-center gap-1.5 text-sm">
                  <ImageIcon className="w-4 h-4 text-bronze-600 dark:text-bronze-400" />
                  書籍封面管理 (Book Cover)
                </label>
                <p className="text-xs text-ink-500 dark:text-academic-mutedDark mt-0.5">
                  支援從電腦選擇本機圖片 (JPG/PNG/WebP，上限 5MB)，或相容外部圖片網址。
                </p>
              </div>

              {/* Mode switch tabs */}
              <div className="inline-flex rounded-lg border border-academic-borderLight dark:border-academic-borderDark p-0.5 bg-paper-200 dark:bg-ink-900 text-xs">
                <button
                  type="button"
                  onClick={() => setCoverMode('local')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    coverMode === 'local'
                      ? 'bg-paper-50 dark:bg-academic-cardDark text-bronze-700 dark:text-bronze-400 shadow-xs'
                      : 'text-ink-600 dark:text-ink-400 hover:text-ink-900'
                  }`}
                >
                  本機上傳
                </button>
                <button
                  type="button"
                  onClick={() => setCoverMode('url')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    coverMode === 'url'
                      ? 'bg-paper-50 dark:bg-academic-cardDark text-bronze-700 dark:text-bronze-400 shadow-xs'
                      : 'text-ink-600 dark:text-ink-400 hover:text-ink-900'
                  }`}
                >
                  外部網址
                </button>
              </div>
            </div>

            {/* Error or Success banners */}
            {coverError && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{coverError}</span>
              </div>
            )}
            {coverSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{coverSuccess}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {/* Cover Preview Box */}
              <div className="relative w-32 h-44 shrink-0 rounded-lg overflow-hidden border border-academic-borderLight dark:border-academic-borderDark bg-paper-200 dark:bg-ink-900 flex items-center justify-center shadow-xs">
                {selectedFilePreview ? (
                  <img
                    src={selectedFilePreview}
                    alt="選取的封面預覽"
                    className="w-full h-full object-cover"
                  />
                ) : book.coverImage ? (
                  <img
                    src={
                      book.coverImage.startsWith('http://') || book.coverImage.startsWith('https://')
                        ? book.coverImage
                        : localApiService.getBookCoverApiUrl(book.id, coverTimestamp)
                    }
                    alt={book.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="p-2 text-center text-ink-400 dark:text-ink-500">
                    <BookOpen className="w-8 h-8 mx-auto mb-1 opacity-50 text-bronze-600 dark:text-bronze-400" />
                    <span className="text-[11px] block font-serif">預設封面</span>
                  </div>
                )}

                {/* State Tag Badge */}
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-ink-900/80 text-paper-50 backdrop-blur-xs">
                  {selectedFilePreview
                    ? '待儲存'
                    : book.coverImage
                    ? (book.coverImage.startsWith('http') ? '外部' : '本機')
                    : '預設'}
                </span>
              </div>

              {/* Controls Section */}
              <div className="flex-1 space-y-3 w-full">
                {coverMode === 'local' ? (
                  <div className="space-y-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="p-3 rounded-lg bg-paper-50 dark:bg-academic-cardDark border border-bronze-300 dark:border-bronze-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-ink-800 dark:text-ink-200 truncate max-w-[200px]">
                            {selectedFile.name}
                          </span>
                          <span className="text-ink-400 text-[11px]">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleUploadCover}
                            disabled={uploadingCover}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bronze-600 text-paper-50 hover:bg-bronze-700 text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            {uploadingCover ? '上傳中...' : '確認儲存封面'}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelSelectedFile}
                            disabled={uploadingCover}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark text-ink-600 dark:text-ink-300 text-xs hover:bg-paper-200 dark:hover:bg-ink-800 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingCover}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark text-ink-800 dark:text-ink-200 text-xs font-semibold hover:border-bronze-600 transition-colors shadow-xs cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-bronze-600 dark:text-bronze-400" />
                          {book.coverImage && !book.coverImage.startsWith('http') ? '更換本機封面' : '從電腦選擇圖片'}
                        </button>

                        {book.coverImage && (
                          <button
                            type="button"
                            onClick={handleDeleteCover}
                            disabled={uploadingCover}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            移除封面
                          </button>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-ink-400 dark:text-academic-mutedDark">
                      支援 JPG, JPEG, PNG, WebP。上傳後自動存放於本機私有資料庫，發布時安全同步。
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={book.coverImage}
                        onChange={e => setBook({ ...book, coverImage: e.target.value })}
                        placeholder="請輸入外部圖片網址 (https://...)"
                        className="flex-1 p-2 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-50 dark:bg-academic-cardDark text-ink-900 dark:text-ink-100 text-xs font-mono"
                      />
                      {book.coverImage && (
                        <button
                          type="button"
                          onClick={() => setBook({ ...book, coverImage: '' })}
                          className="px-2.5 py-2 rounded-lg border border-academic-borderLight dark:border-academic-borderDark text-xs text-ink-600 hover:text-red-600 cursor-pointer"
                          title="清除網址"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-400 dark:text-academic-mutedDark">
                      保留現有外部圖片相容性。如改用本機上傳，請切換至「本機上傳」分頁。
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">
              公開狀態 (Status) *
            </label>
            <select
              value={book.status}
              onChange={e => setBook({ ...book, status: e.target.value as BookStatus })}
              className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 font-medium"
            >
              <option value="draft">草稿 Draft (僅存本機，不得發布)</option>
              <option value="private">私人 Private (本機保密，永不公開)</option>
              <option value="public">公開 Public (經安全審核發布至 GitHub Pages)</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">
              研讀狀態與進度 (0 - 100%)
            </label>
            <div className="flex gap-2">
              <select
                value={book.readingStatus}
                onChange={e => setBook({ ...book, readingStatus: e.target.value as ReadingState })}
                className="w-1/2 p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
              >
                <option value="reading">研讀中</option>
                <option value="completed">已讀完</option>
                <option value="unread">未讀</option>
                <option value="abandoned">已擱置</option>
              </select>
              <input
                type="number"
                min="0"
                max="100"
                value={book.progress}
                onChange={e => setBook({ ...book, progress: parseInt(e.target.value) || 0 })}
                className="w-1/2 p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Tags management */}
        <div className="text-xs space-y-2">
          <label className="font-bold text-ink-700 dark:text-ink-300 block">標籤 (Tags)</label>
          <div className="flex flex-wrap items-center gap-1.5">
            {book.tags?.map(t => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-paper-200 dark:bg-ink-800 text-ink-800 dark:text-ink-200"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t)}
                  className="text-ink-400 hover:text-rose-600 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 max-w-sm pt-1">
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="輸入新標籤按新增..."
              className="flex-1 p-2 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 text-xs"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-3 py-2 rounded-lg bg-paper-200 dark:bg-ink-800 font-bold text-ink-700 hover:bg-paper-300"
            >
              新增標籤
            </button>
          </div>
        </div>

        {/* Core Idea & Motivation & Introduction */}
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">
              全書核心思想 (Core Idea)
            </label>
            <textarea
              rows={3}
              value={book.coreIdea}
              onChange={e => setBook({ ...book, coreIdea: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 leading-relaxed font-serif"
            />
          </div>

          <div>
            <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">
              書籍介紹與歷史背景 (Introduction)
            </label>
            <textarea
              rows={4}
              value={book.introduction}
              onChange={e => setBook({ ...book, introduction: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 leading-relaxed"
            />
          </div>

          <div>
            <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">
              個人研讀動機 (Reading Motivation)
            </label>
            <textarea
              rows={3}
              value={book.motivation}
              onChange={e => setBook({ ...book, motivation: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Chapters Management Section */}
      <div className="p-6 rounded-2xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-ink-900 dark:text-ink-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-bronze-600" />
              原書章節管理與排序
            </h2>
            <p className="text-xs text-ink-500 dark:text-academic-mutedDark mt-0.5">
              保持原書目錄結構。使用上下箭頭調整章節順序，點擊「編輯筆記」填寫標準 8 步筆記。
            </p>
          </div>

          <button
            onClick={() => setShowAddChapterModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-bronze-600 text-paper-50 hover:bg-bronze-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            新增章節
          </button>
        </div>

        {/* Chapter List Table */}
        {(!book.chapters || book.chapters.length === 0) ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-academic-borderLight dark:border-academic-borderDark text-ink-500 text-xs">
            本書尚未建立任何章節。點擊「新增章節」開始建立。
          </div>
        ) : (
          <div className="space-y-3">
            {book.chapters.map((ch, idx) => (
              <div
                key={ch.id}
                className="p-4 rounded-xl bg-paper-100 dark:bg-ink-800/40 border border-academic-borderLight dark:border-academic-borderDark flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveChapter(idx, 'up')}
                      className="p-1 rounded hover:bg-paper-200 text-ink-500 disabled:opacity-20"
                      title="往上移動順序"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === book.chapters.length - 1}
                      onClick={() => handleMoveChapter(idx, 'down')}
                      className="p-1 rounded hover:bg-paper-200 text-ink-500 disabled:opacity-20"
                      title="往下移動順序"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-7 h-7 rounded-full bg-paper-200 dark:bg-ink-700 text-bronze-700 dark:text-bronze-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>

                  <div>
                    <h3 className="font-serif text-sm font-bold text-ink-900 dark:text-ink-100">
                      {ch.title}
                    </h3>
                    <p className="text-[11px] text-ink-500 font-mono">
                      ID: {ch.id} {ch.subtitle && `· ${ch.subtitle}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Link
                    to={`/manager/books/${book.id}/chapters/${ch.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-bronze-300 dark:border-bronze-700 bg-bronze-50 dark:bg-bronze-950/40 text-xs font-bold text-bronze-800 dark:text-bronze-300 hover:bg-bronze-100 transition-colors"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    編輯 8 步筆記
                  </Link>

                  <button
                    onClick={() => handleDeleteChapter(ch.id, ch.title)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="刪除章節"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Chapter Modal */}
      {showAddChapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-paper-50 dark:bg-academic-cardDark rounded-2xl border border-academic-borderLight dark:border-academic-borderDark p-6 w-full max-w-lg shadow-xl space-y-4">
            <h2 className="font-serif text-xl font-bold text-ink-900 dark:text-ink-100">
              新增章節筆記
            </h2>

            <form onSubmit={handleCreateChapter} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">
                  章節 ID 代號 (例如：chapter-03) *
                </label>
                <input
                  type="text"
                  required
                  value={newChId}
                  onChange={e => setNewChId(e.target.value)}
                  placeholder={`chapter-${String((book.chapters?.length || 0) + 1).padStart(2, '0')}`}
                  className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">
                  章節標題 (保留原書完整章節名稱) *
                </label>
                <input
                  type="text"
                  required
                  value={newChTitle}
                  onChange={e => setNewChTitle(e.target.value)}
                  placeholder="第三章：我能貢獻什麼？"
                  className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
                />
              </div>

              <div>
                <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">
                  副標題 (可選)
                </label>
                <input
                  type="text"
                  value={newChSubtitle}
                  onChange={e => setNewChSubtitle(e.target.value)}
                  placeholder="重視貢獻是有效性的關鍵"
                  className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
                />
              </div>

              <div>
                <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">
                  預估閱讀時間 (分鐘)
                </label>
                <input
                  type="number"
                  min="1"
                  value={newChTime}
                  onChange={e => setNewChTime(parseInt(e.target.value) || 15)}
                  className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-academic-borderLight dark:border-academic-borderDark">
                <button
                  type="button"
                  onClick={() => setShowAddChapterModal(false)}
                  className="px-4 py-2 rounded-lg border border-academic-borderLight dark:border-academic-borderDark text-ink-600 hover:bg-paper-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-bronze-600 text-paper-50 font-bold hover:bg-bronze-700 shadow-sm"
                >
                  確認建立章節
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

