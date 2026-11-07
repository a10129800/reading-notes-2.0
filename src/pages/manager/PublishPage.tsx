import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { localApiService } from '../../services/localApiService';
import { PublishPipelineResult, DeploymentStatus, PublishRecord } from '../../types';
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
  Globe,
  Clock,
  XCircle,
  HelpCircle,
  History,
  Info,
  Check,
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
  const [history, setHistory] = useState<PublishRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [reconnectNotice, setReconnectNotice] = useState<string | null>(null);

  const pollTimerRef = useRef<any>(null);
  const progressTimerRef = useRef<any>(null);
  const currentTaskIdRef = useRef<string | null>(null);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const data = await localApiService.getPublishPreview();
      setPreview(data);
    } catch (err: any) {
      console.error('Failed to load preview:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const records = await localApiService.getPublishHistory();
      setHistory(records);
    } catch (err) {
      console.warn('Failed to load publish history:', err);
    }
  };

  const startProgressPolling = (taskId?: string) => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    let attempts = 0;
    const maxAttempts = 180; // 180 * 1s = 3 minutes timeout guard

    progressTimerRef.current = setInterval(async () => {
      attempts++;
      if (attempts >= maxAttempts) {
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        setPublishing(false);
        return;
      }

      try {
        const cur = await localApiService.getCurrentPublishTask();
        if (cur.task) {
          setPipelineResult(cur.task);
        }
        if (!cur.inProgress) {
          if (progressTimerRef.current) clearInterval(progressTimerRef.current);
          setPublishing(false);
          setReconnectNotice(null);

          // If we had a specific taskId, ensure we load its final state
          const targetId = taskId || currentTaskIdRef.current;
          if (targetId) {
            try {
              const taskInfo = await localApiService.getPublishTask(targetId);
              if (taskInfo.found && taskInfo.record) {
                const rec = taskInfo.record;
                setPipelineResult({
                  taskId: rec.taskId,
                  success: rec.status === 'success' || rec.status === 'skipped',
                  timestamp: rec.startedAt,
                  stages: rec.stages,
                  summary: {
                    publishedBooks: rec.publishedBooks || [],
                    publishedCount: rec.publishedBooks?.length || 0,
                    removedCount: 0,
                    commitHash: rec.commitHash,
                    pushed: rec.pushed,
                    hasContentChanges: rec.hasContentChanges,
                    pagesUrl: 'https://a10129800.github.io/reading-notes-2.0/',
                    actionsUrl: 'https://github.com/a10129800/reading-notes-2.0/actions',
                    failedStep: rec.failedStep,
                  },
                  error: rec.error,
                });
                if (rec.pushed && rec.commitHash) {
                  startDeploymentPolling(rec.commitHash);
                }
              }
            } catch {}
          }
          loadHistory();
          loadPreview();
        }
      } catch {}
    }, 1000);
  };

  const startDeploymentPolling = (commitHash?: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    let attempts = 0;
    const maxAttempts = 30; // 30 * 4s = 120s max tracking

    const poll = async () => {
      attempts++;
      try {
        const dep = await localApiService.getDeploymentStatus(commitHash);
        setDeploymentStatus(dep);

        const isShaMatch = Boolean(
          dep.isMatchSha === true &&
          (!commitHash || (dep.pagesDeploymentSha && commitHash.toLowerCase() === dep.pagesDeploymentSha.toLowerCase()))
        );

        if (dep.status === 'completed') {
          if (dep.conclusion === 'failure' || (dep.conclusion === 'success' && dep.pagesStatus === 'success' && isShaMatch)) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          }
        }
        if (attempts >= maxAttempts) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        }
      } catch (err) {
        console.warn('Deployment status poll failed:', err);
      }
    };

    poll();
    pollTimerRef.current = setInterval(poll, 4000);
  };

  useEffect(() => {
    loadPreview();
    loadHistory();

    // Check if there is an active running publish task in background
    localApiService.getCurrentPublishTask().then((cur) => {
      if (cur.inProgress && cur.task) {
        setPublishing(true);
        setPipelineResult(cur.task);
        startProgressPolling();
      } else {
        // Restore latest completed record from history if no active task
        localApiService.getPublishHistory().then((records) => {
          if (records.length > 0 && !pipelineResult) {
            const latest = records[0];
            setPipelineResult({
              taskId: latest.taskId,
              success: latest.status === 'success' || latest.status === 'skipped',
              timestamp: latest.startedAt,
              stages: latest.stages,
              summary: {
                publishedBooks: latest.publishedBooks || [],
                publishedCount: latest.publishedBooks?.length || 0,
                removedCount: 0,
                commitHash: latest.commitHash,
                pushed: latest.pushed,
                hasContentChanges: latest.hasContentChanges,
                pagesUrl: 'https://a10129800.github.io/reading-notes-2.0/',
                actionsUrl: 'https://github.com/a10129800/reading-notes-2.0/actions',
                failedStep: latest.failedStep,
              },
              error: latest.error,
            });
            if (latest.commitHash && latest.pushed) {
              localApiService.getDeploymentStatus(latest.commitHash).then(setDeploymentStatus).catch(() => {});
            }
          }
        }).catch(() => {});
      }
    }).catch(() => {});

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const handleFullPublish = async () => {
    if (!confirm('確認執行【一鍵發布至 GitHub Pages】？\n\n系統將自動完成：\n1. 本機公開資料庫白名單同步\n2. 零洩漏安全性檢查\n3. 靜態建置打包檢驗\n4. 精準 Stage 公開內容並建立 Git Commit\n5. 安全推送至 GitHub master\n6. 追蹤 GitHub Actions 與 Pages 雲端部署')) {
      return;
    }

    const taskId = 'pub-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    currentTaskIdRef.current = taskId;

    setPublishing(true);
    setActivePipelineMode('full');
    setDeploymentStatus(null);
    setReconnectNotice(null);
    startProgressPolling(taskId);

    try {
      const res = await localApiService.publishPipeline(true, taskId);
      setPipelineResult(res);
      loadPreview();
      loadHistory();
      if (res.summary.pushed && res.summary.commitHash) {
        startDeploymentPolling(res.summary.commitHash);
      }
    } catch (err: any) {
      // Resilience inspection: verify by exact taskId
      try {
        const taskInfo = await localApiService.getPublishTask(taskId);
        if (taskInfo.found) {
          if (taskInfo.isLive && taskInfo.task) {
            setReconnectNotice('本機連線短暫不穩定，後端發布管線仍在背景安全執行中...');
            setPipelineResult(taskInfo.task);
            return;
          }
          if (taskInfo.record) {
            const rec = taskInfo.record;
            setPipelineResult({
              taskId: rec.taskId,
              success: rec.status === 'success' || rec.status === 'skipped',
              timestamp: rec.startedAt,
              stages: rec.stages,
              summary: {
                publishedBooks: rec.publishedBooks || [],
                publishedCount: rec.publishedBooks?.length || 0,
                removedCount: 0,
                commitHash: rec.commitHash,
                pushed: rec.pushed,
                hasContentChanges: rec.hasContentChanges,
                pagesUrl: 'https://a10129800.github.io/reading-notes-2.0/',
                actionsUrl: 'https://github.com/a10129800/reading-notes-2.0/actions',
                failedStep: rec.failedStep,
              },
              error: rec.error,
            });
            loadPreview();
            loadHistory();
            if (rec.pushed && rec.commitHash) {
              startDeploymentPolling(rec.commitHash);
            }
            return;
          }
        }
      } catch {}
      alert(`發布流程發生錯誤：${err.message}`);
    } finally {
      const cur = await localApiService.getCurrentPublishTask().catch(() => ({ inProgress: false }));
      if (!cur.inProgress) {
        setPublishing(false);
      }
    }
  };

  const handleLocalSyncOnly = async () => {
    if (!confirm('執行【僅本機白名單同步】？這將只更新本機 content/public-books/ 與索引，不會執行 Git Commit 或 Push。')) {
      return;
    }

    setPublishing(true);
    setActivePipelineMode('local');
    setReconnectNotice(null);
    startProgressPolling();

    try {
      const res = await localApiService.publishPipeline(false);
      setPipelineResult(res);
      loadPreview();
      loadHistory();
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
          {history.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-3 py-2 rounded-lg border border-academic-borderLight dark:border-academic-borderDark hover:bg-paper-200 dark:hover:bg-academic-cardDark transition-colors font-medium text-xs text-ink-700 dark:text-ink-300 flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5" />
              {showHistory ? '收合歷史' : '發布紀錄'}
            </button>
          )}

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
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-paper-50 font-bold text-xs shadow-sm transition-all ${
              publishing
                ? 'bg-amber-600 cursor-not-allowed'
                : 'bg-academic-navy hover:bg-bronze-700'
            }`}
          >
            {publishing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                發布管線執行中...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                一鍵發布至 GitHub Pages
              </>
            )}
          </button>
        </div>
      </div>

      {/* Reconnect notice */}
      {reconnectNotice && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-amber-600 animate-spin flex-shrink-0" />
          <span>{reconnectNotice}</span>
        </div>
      )}

      {/* Multi-Stage Pipeline Result Panel */}
      {pipelineResult && (
        <div className="p-6 rounded-2xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-academic-borderLight dark:border-academic-borderDark flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {pipelineResult.success ? (
                pipelineResult.summary.hasContentChanges === false ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-600" />
                    公開內容與遠端一致（無須重複發布）
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {pipelineResult.summary.pushed ? '已成功推送至 GitHub' : '本機安全同步完成'}
                  </span>
                )
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  發布中斷或需要確認
                </span>
              )}
              <span className="text-xs text-ink-500">
                {new Date(pipelineResult.timestamp).toLocaleString('zh-TW')}
              </span>
              {pipelineResult.summary.commitHash && (
                <span
                  className="font-mono text-xs px-2 py-0.5 rounded bg-paper-200 dark:bg-zinc-800 text-ink-700 dark:text-ink-300"
                  title={pipelineResult.summary.commitHash}
                >
                  Commit: {pipelineResult.summary.commitHash.slice(0, 7)}
                </span>
              )}
            </div>

            {/* Quick Link Buttons */}
            <div className="flex items-center gap-2">
              <a
                href={pipelineResult.summary.actionsUrl || 'https://github.com/a10129800/reading-notes-2.0/actions'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-mono rounded bg-paper-200 dark:bg-zinc-800 text-ink-700 dark:text-ink-300 hover:bg-paper-300"
              >
                <GitBranch className="w-3.5 h-3.5" />
                Actions 記錄
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={pipelineResult.summary.pagesUrl || 'https://a10129800.github.io/reading-notes-2.0/'}
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

          {/* Cloud Actions & Pages Real-Time Deployment Tracker */}
          {pipelineResult.summary.pushed && (
            <div className="p-4 rounded-xl bg-academic-navy/5 dark:bg-academic-navy/20 border border-academic-navy/20 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-serif text-xs font-bold text-academic-navy dark:text-paper-100 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-bronze-600" />
                  GitHub Pages 雲端部署追蹤
                </span>
                {deploymentStatus ? (
                  <div className="flex items-center gap-2">
                    {deploymentStatus.commitHash && (
                      <span className="text-[11px] font-mono text-ink-500" title={deploymentStatus.commitHash}>
                        追蹤 Commit: {deploymentStatus.commitHash.slice(0, 7)}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold flex items-center gap-1 ${
                        deploymentStatus.status === 'completed' && deploymentStatus.conclusion === 'success' && deploymentStatus.pagesStatus === 'success' && deploymentStatus.isMatchSha === true
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : deploymentStatus.status === 'completed' && deploymentStatus.conclusion === 'failure'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                      }`}
                    >
                      {deploymentStatus.status === 'completed' && deploymentStatus.conclusion === 'success' && deploymentStatus.pagesStatus === 'success' && deploymentStatus.isMatchSha === true ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          正式網站已就緒 (Live)
                        </>
                      ) : deploymentStatus.status === 'completed' && deploymentStatus.conclusion === 'failure' ? (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          CI 驗證未通過
                        </>
                      ) : deploymentStatus.pagesStatus === 'pending' ? (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Pages 排程等待中 ({deploymentStatus.status})
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          雲端建置部署中 ({deploymentStatus.status})
                        </>
                      )}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-ink-500 flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    連線至 GitHub 查詢部署進度...
                  </span>
                )}
              </div>

              {deploymentStatus?.failedStep && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs">
                  <span className="font-bold">CI 失敗步驟：</span> {deploymentStatus.failedStep}
                  <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-300">
                    建置流水線已自動停止部署，未影響現有線上服務。請根據失敗步驟修正本機測試後再次發布。
                  </p>
                </div>
              )}

              <p className="text-[11px] text-ink-500">
                GitHub Actions 部署通常需要 30~60 秒。部署完成且 Pages 狀態顯示為 Live 後，公開網址內容將自動生效。
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

      {/* History Panel (collapsible) */}
      {showHistory && history.length > 0 && (
        <div className="p-5 rounded-2xl bg-paper-100 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark space-y-3">
          <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-bronze-700 dark:text-bronze-400 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            最近發布歷史紀錄（本機私有紀錄）
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {history.map((rec) => (
              <div
                key={rec.taskId}
                className="p-3 rounded-lg bg-paper-50 dark:bg-ink-800 border border-academic-borderLight dark:border-academic-borderDark flex items-center justify-between text-xs gap-3"
              >
                <div className="flex items-center gap-2">
                  {rec.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : rec.status === 'skipped' ? (
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  )}
                  <div>
                    <span className="font-mono font-bold text-ink-900 dark:text-ink-100" title={rec.commitHash}>
                      {rec.commitHash ? `Commit: ${rec.commitHash.slice(0, 7)}` : '無 Commit（略過）'}
                    </span>
                    <span className="text-ink-500 text-[11px] block">
                      {new Date(rec.startedAt).toLocaleString('zh-TW')} · 書籍: {rec.publishedBooks?.join('、') || '無'}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                      rec.status === 'success'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                        : rec.status === 'skipped'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                    }`}
                  >
                    {rec.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
          <li>4. 若公開書庫內容與遠端無實質差異，系統自動略過 Commit，杜絕無意義時間戳更新提交。</li>
          <li>5. 若 GitHub 遠端 master 存在未同步的更新，系統自動偵測並中斷推送，杜絕任何強制覆蓋風險。</li>
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
