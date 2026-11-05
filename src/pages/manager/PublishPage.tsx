import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { localApiService } from '../../services/localApiService';
import {
  ShieldCheck,
  Upload,
  CheckCircle2,
  Lock,
  FileEdit,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  BookOpen
} from 'lucide-react';

export const PublishPage: React.FC = () => {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<{
    willPublish: Array<{ id: string; title: string; chaptersCount: number }>;
    willKeepPrivate: Array<{ id: string; title: string }>;
    willKeepDraft: Array<{ id: string; title: string }>;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    success: boolean;
    publishedCount: number;
    publishedBooks: string[];
    removedCount: number;
    timestamp: string;
  } | null>(null);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const data = await localApiService.getPublishPreview();
      setPreview(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview();
  }, []);

  const handlePublish = async () => {
    if (!confirm('確認執行安全發布？白名單機制將僅複製 status === "public" 的書籍與章節至公開資料夾。')) {
      return;
    }
    setPublishing(true);
    try {
      const res = await localApiService.publish();
      setPublishResult(res);
      loadPreview();
    } catch (err: any) {
      alert(`發布失敗：${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-academic-borderLight dark:border-academic-borderDark">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/manager')}
            className="p-2 rounded-lg border border-academic-borderLight dark:border-academic-borderDark hover:bg-paper-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-serif text-2xl font-extrabold text-ink-900 dark:text-ink-100 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-bronze-600" />
              公開發布安全審核流水線
            </h1>
            <p className="text-xs text-ink-500">
              白名單發布機制：嚴格檢查書籍 status 欄位，未知、私人或草稿書籍絕對禁止輸出。
            </p>
          </div>
        </div>

        <button
          onClick={handlePublish}
          disabled={publishing || loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-academic-navy text-paper-50 hover:bg-bronze-700 transition-colors font-bold text-xs shadow-sm"
        >
          <Upload className="w-4 h-4" />
          {publishing ? '安全發布執行中...' : '執行安全發布 (Publish)'}
        </button>
      </div>

      {/* Result Notice */}
      {publishResult && (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>發布成功！公開書庫與搜尋清單已安全同步</span>
          </div>
          <p className="text-xs leading-relaxed">
            共同步輸出 {publishResult.publishedCount} 本公開書籍（{publishResult.publishedBooks.join('、')}）；
            {publishResult.removedCount > 0 && `已安全清除 ${publishResult.removedCount} 個切換為私人的歷史公開資料夾；`}
            時間戳記：{new Date(publishResult.timestamp).toLocaleString('zh-TW')}。
          </p>
        </div>
      )}

      {/* Security Principles Reminder */}
      <div className="p-5 rounded-xl bg-paper-100 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark space-y-2">
        <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-bronze-700 dark:text-bronze-400 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          安全發布承諾與隔離規範
        </h3>
        <ul className="text-xs text-ink-600 dark:text-academic-mutedDark space-y-1">
          <li>1. 私人書籍 (Private) 與草稿 (Draft) 物理儲存於專案外的獨立目錄，絕不上傳至公開 Git Repository。</li>
          <li>2. 僅明確符合 <code className="font-mono text-bronze-700 bg-paper-200 px-1 py-0.5 rounded">status === "public"</code> 的書籍才會輸出至公開建置輸入源。</li>
          <li>3. 未知狀態、私人圖片或私人筆記段落一律被發布引擎阻斷隔離。</li>
          <li>4. 當公開書籍切換為私人時，發布引擎會自動清除 public-books 內對應的舊頁面與索引。</li>
        </ul>
      </div>

      {/* Pre-publish Diff Columns */}
      {loading ? (
        <div className="p-16 text-center text-ink-400">載入發布預覽中...</div>
      ) : preview && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Will Publish Column */}
          <div className="p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200 dark:border-emerald-900/40">
              <span className="font-serif text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                將公開輸出 ({preview.willPublish.length})
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold">
                Public
              </span>
            </div>

            {preview.willPublish.length === 0 ? (
              <p className="text-xs text-ink-400 py-4 text-center">無任何公開書籍</p>
            ) : (
              <div className="space-y-2">
                {preview.willPublish.map(b => (
                  <div key={b.id} className="p-3 rounded-lg bg-paper-50 dark:bg-ink-800 border border-emerald-200 dark:border-emerald-900/30 text-xs">
                    <span className="font-serif font-bold text-ink-900 dark:text-ink-100 block">
                      《{b.title}》
                    </span>
                    <span className="text-[11px] text-ink-500 font-mono">
                      ID: {b.id} · {b.chaptersCount} 章節
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Will Keep Private Column */}
          <div className="p-5 rounded-2xl bg-zinc-100/60 dark:bg-zinc-800/30 border border-zinc-300 dark:border-zinc-700 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-700">
              <span className="font-serif text-sm font-bold text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-zinc-600" />
                完全隔離保密 ({preview.willKeepPrivate.length})
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold">
                Private
              </span>
            </div>

            {preview.willKeepPrivate.length === 0 ? (
              <p className="text-xs text-ink-400 py-4 text-center">無私人書籍</p>
            ) : (
              <div className="space-y-2">
                {preview.willKeepPrivate.map(b => (
                  <div key={b.id} className="p-3 rounded-lg bg-paper-50 dark:bg-ink-800 border border-zinc-200 dark:border-zinc-700 text-xs">
                    <span className="font-serif font-bold text-ink-900 dark:text-ink-100 block">
                      《{b.title}》
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      ID: {b.id} (僅保存在本機)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Will Keep Draft Column */}
          <div className="p-5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-900/40">
              <span className="font-serif text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <FileEdit className="w-4 h-4 text-amber-600" />
                研讀草稿不輸出 ({preview.willKeepDraft.length})
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                Draft
              </span>
            </div>

            {preview.willKeepDraft.length === 0 ? (
              <p className="text-xs text-ink-400 py-4 text-center">無草稿書籍</p>
            ) : (
              <div className="space-y-2">
                {preview.willKeepDraft.map(b => (
                  <div key={b.id} className="p-3 rounded-lg bg-paper-50 dark:bg-ink-800 border border-amber-200 dark:border-amber-900/30 text-xs">
                    <span className="font-serif font-bold text-ink-900 dark:text-ink-100 block">
                      《{b.title}》
                    </span>
                    <span className="text-[11px] text-amber-600 font-mono">
                      ID: {b.id} (草稿中)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

