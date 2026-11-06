import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { localApiService } from '../../services/localApiService';
import { PublishPipelineResult, DeploymentStatus } from '../../types';
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
  GitBranch,
  GitCommit,
  Layers,
  Globe,
  Clock,
  XCircle,
  HelpCircle
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
  const [activePipelineMode, setActivePipelineMode] = useState<'full' | 'local'>('full');
  const [pipelineResult, setPipelineResult] = useState<PublishPipelineResult | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const pollTimerRef = useRef<any>(null);

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
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const startDeploymentPolling = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    let attempts = 0;
    const maxAttempts = 15; // Poll up to 60s (15 * 4s)

    const poll = async () => {
      attempts++;
      try {
        const dep = await localApiService.getDeploymentStatus();
        setDeploymentStatus(dep);
        if (dep.status === 'completed' || attempts >= maxAttempts) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        }
      } catch (err) {
        console.warn('Deployment status poll failed:', err);
      }
    };

    poll();
    pollTimerRef.current = setInterval(poll, 4000);
  };

  const handleFullPublish = async () => {
    if (!confirm('確認執行【一鍵發布至 GitHub Pages】？\n\n系統將自動完成：\n1. 本機公開資料庫白名單同步\n2. 零洩漏安全性檢查\n3. 靜態建置打包檢驗\n4. 精準 Stage 公開內容並建立 Git Commit\n5. 安全推送至 GitHub master\n6. 追蹤 GitHub Actions 雲端部署')) {
      return;
    }

    setPublishing(true);
    setActivePipelineMode('full');
    setDeploymentStatus(null);
    try {
      const res = await localApiService.publishPipeline(true);
      setPipelineResult(res);
      loadPreview();
      if (res.summary.pushed) {
        startDeploymentPolling();
      }
    } catch (err: any) {
      alert(`發布流程發生錯誤：${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleLocalSyncOnly = async () => {
    if (!confirm('執行【僅本機白名單同步】？這將只更新本機 content/public-books/ 與索引，不會執行 Git Commit 或 Push。')) {
      return;
    }

    setPublishing(true);
    setActivePipelineMode('local');
    try {
      const res = await localApiService.publishPipeline(false);
      setPipelineResult(res);
      loadPreview();
    } catch (err: any) {
      alert(`本機同步失敗：${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const renderStageIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />;
      case 'in_progress':
        return <RefreshCw className="w-5 h-5 text-amber-600 animate-spin flex-shrink-0" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />;
      case 'skipped':
        return <HelpCircle className="w-5 h-5 text-zinc-400 flex-shrink-0" />;
      default:
        return <Clock className="w-5 h-5 text-zinc-400 flex-shrink-0" />;
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-academic-borderLight dark:border-academic-borderDark gap-4">
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
              白名單發布機制：精準 Stage 公開書庫、零洩漏檢查、安全 Git Push 與 GitHub Pages 自動化部署。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLocalSyncOnly}
            disabled={publishing || loading}
            className="px-3 py-2 rounded-lg border border-academic-borderLight dark:border-academic-borderDark hover:bg-paper-200 dark:hover:bg-academic-cardDark transition-colors font-medium text-xs text-ink-700 dark:text-ink-300"
            title="僅更新本機公開資料夾，不推送 GitHub"
          >
            僅本機同步
          </button>
          <button
            onClick={handleFullPublish}
            disabled={publishing || loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-academic-navy text-paper-50 hover:bg-bronze-700 transition-colors font-bold text-xs shadow-sm"
          >
            <Upload className="w-4 h-4" />
            {publishing ? '發布管線執行中...' : '一鍵發布至 GitHub Pages'}
          </button>
        </div>
      </div>

      {/* Multi-Stage Pipeline Result Panel */}
      {pipelineResult && (
        <div className="p-6 rounded-2xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-academic-borderLight dark:border-academic-borderDark">
            <div className="flex items-center gap-2">
              {pipelineResult.success ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {pipelineResult.summary.pushed ? '已成功推送至 GitHub' : '本機安全同步完成'}
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  發布中斷或需要確認
                </span>
              )}
              <span className="text-xs text-ink-500">
                {new Date(pipelineResult.timestamp).toLocaleString('zh-TW')}
              </span>
            </div>

            {/* Quick Link Buttons */}
            <div className="flex items-center gap-2">
              <a
                href={pipelineResult.summary.actionsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-mono rounded bg-paper-200 dark:bg-zinc-800 text-ink-700 dark:text-ink-300 hover:bg-paper-300"
              >
                <GitBranch className="w-3.5 h-3.5" />
                Actions 記錄
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={pipelineResult.summary.pagesUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-serif font-bold rounded bg-academic-navy text-paper-50 hover:bg-bronze-700"
              >
                <Globe className="w-3.5 h-3.5" />
                開啟公開網站
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* 6 Stages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(pipelineResult.stages).map((st) => (
              <div
                key={st.id}
                className="p-3.5 rounded-xl border border-academic-borderLight dark:border-academic-borderDark bg-paper-100/60 dark:bg-zinc-800/40 flex items-start gap-3"
              >
                {renderStageIcon(st.status)}
                <div className="space-y-0.5 text-xs">
                  <div className="font-bold text-ink-900 dark:text-ink-100 flex items-center gap-1.5">
                    <span>{st.name}</span>
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded ${
                        st.status === 'success'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : st.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                          : st.status === 'failed'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                          : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {st.status}
                    </span>
                  </div>
                  <p className="text-ink-600 dark:text-academic-mutedDark leading-relaxed">
                    {st.message || '等待處理中...'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Cloud Actions Real-Time Deployment Tracker */}
          {pipelineResult.summary.pushed && (
            <div className="p-4 rounded-xl bg-academic-navy/5 dark:bg-academic-navy/20 border border-academic-navy/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-serif text-xs font-bold text-academic-navy dark:text-paper-100 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-bronze-600" />
                  GitHub Pages 雲端部署追蹤
                </span>
                {deploymentStatus ? (
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold flex items-center gap-1 ${
                      deploymentStatus.status === 'completed' && deploymentStatus.conclusion === 'success'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                        : deploymentStatus.status === 'completed' && deploymentStatus.conclusion === 'failure'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                    }`}
                  >
                    {deploymentStatus.status === 'completed' && deploymentStatus.conclusion === 'success' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        公開網站已就緒 (Live)
                      </>
                    ) : deploymentStatus.status === 'completed' && deploymentStatus.conclusion === 'failure' ? (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        部署未通過
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        雲端建置部署中 ({deploymentStatus.status})
                      </>
                    )}
                  </span>
                ) : (
                  <span className="text-[11px] text-ink-500 flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    連線至 GitHub 查詢狀態中...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-500">
                GitHub Actions 部署通常需要 30~60 秒。部署完成後，公開網址內容將自動生效。
              </p>
            </div>
          )}

          {/* Error Details */}
          {pipelineResult.error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs">
              <span className="font-bold">錯誤詳情：</span> {pipelineResult.error}
            </div>
          )}
        </div>
      )}

      {/* Security Principles Reminder */}
      <div className="p-5 rounded-xl bg-paper-100 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark space-y-2">
        <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-bronze-700 dark:text-bronze-400 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          全自動安全發布承諾與隔離規範
        </h3>
        <ul className="text-xs text-ink-600 dark:text-academic-mutedDark space-y-1">
          <li>1. 私人書籍 (Private) 與草稿 (Draft) 物理儲存於專案外的獨立目錄，絕不上傳至公開 Git Repository。</li>
          <li>2. 僅明確符合 <code className="font-mono text-bronze-700 bg-paper-200 px-1 py-0.5 rounded">status === "public"</code> 的書籍才會輸出至公開建置輸入源。</li>
          <li>3. 僅精準暫存 <code className="font-mono text-bronze-700 bg-paper-200 px-1 py-0.5 rounded">content/public-books/</code>，嚴禁任何全局或盲目提交。</li>
          <li>4. 若 GitHub 遠端 master 存在未同步的更新，系統自動偵測並中斷推送，杜絕任何強制覆蓋風險。</li>
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
