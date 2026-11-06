import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { localApiService } from '../../services/localApiService';
import {
  Archive,
  ArrowLeft,
  Plus,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  FileCheck
} from 'lucide-react';

export const BackupRestorePage: React.FC = () => {
  const navigate = useNavigate();
  const [backups, setBackups] = useState<Array<{ filename: string; sizeBytes: number; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const list = await localApiService.getBackups();
      setBackups(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    setNotice(null);
    try {
      const res = await localApiService.createBackup();
      setNotice(`備份成功！檔案名稱：${res.filename} (${(res.sizeBytes / 1024).toFixed(1)} KB)`);
      loadBackups();
    } catch (err: any) {
      alert(`備份失敗：${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (filename: string) => {
    if (!confirm(`⚠️ 警告：即將從備份檔案「${filename}」還原資料。\n\n還原將更新本機工作台的書籍與章節紀錄。是否繼續？`)) {
      return;
    }

    setRestoring(filename);
    setNotice(null);
    try {
      const res = await localApiService.restoreBackup(filename);
      setNotice(`還原成功！已成功載入 ${res.restoredBooks} 本書籍與 ${res.restoredChapters} 篇章節筆記。`);
    } catch (err: any) {
      alert(`還原失敗：${err.message}`);
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
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
              <Archive className="w-6 h-6 text-bronze-600" />
              完整本機資料備份與還原
            </h1>
            <p className="text-xs text-ink-500">
              備份所有書籍中繼資料、8 步篇章筆記與金句收藏。支援格式校驗與版本相容性檢查。
            </p>
          </div>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-bronze-600 text-paper-50 hover:bg-bronze-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {creating ? '備份打包中...' : '建立新備份 (Backup)'}
        </button>
      </div>

      {notice && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Backup list */}
      <div className="p-6 rounded-2xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-base font-bold text-ink-900 dark:text-ink-100 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-bronze-600" />
            本機歷史備份檔案清單 ({backups.length})
          </h2>
          <button
            onClick={loadBackups}
            className="p-1.5 text-xs text-ink-500 hover:text-ink-900 rounded hover:bg-paper-200 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> 重新整理
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-ink-400">讀取備份清單中...</div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-academic-borderLight dark:border-academic-borderDark text-ink-500 text-xs">
            目前尚無歷史備份。點擊右上角「建立新備份」進行首次封存。
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map(bk => (
              <div
                key={bk.filename}
                className="p-4 rounded-xl bg-paper-100 dark:bg-ink-800/40 border border-academic-borderLight dark:border-academic-borderDark flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span className="font-mono font-bold text-ink-900 dark:text-ink-100">
                      {bk.filename}
                    </span>
                  </div>
                  <p className="text-ink-500 text-[11px]">
                    檔案大小：{(bk.sizeBytes / 1024).toFixed(1)} KB · 建立時間：{new Date(bk.createdAt).toLocaleString('zh-TW')}
                  </p>
                </div>

                <button
                  onClick={() => handleRestore(bk.filename)}
                  disabled={restoring === bk.filename}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 font-bold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {restoring === bk.filename ? '還原中...' : '還原此版本'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

