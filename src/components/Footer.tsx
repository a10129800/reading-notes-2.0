import React from 'react';
import { BookOpen, ShieldCheck, Feather } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-academic-borderLight dark:border-academic-borderDark bg-paper-50 dark:bg-academic-bgDark/60 py-12 transition-colors">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-academic-borderLight dark:border-academic-borderDark">
          {/* Brand Col */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded bg-academic-navy text-paper-50 flex items-center justify-center font-serif text-xs font-bold">
                讀
              </div>
              <h3 className="font-serif font-bold text-ink-900 dark:text-ink-100">
                Reading Notes 2.0
              </h3>
            </div>
            <p className="text-xs text-ink-600 dark:text-academic-mutedDark leading-relaxed">
              個人數位閱讀筆記與知識分享平台。堅持原書篇章結構、8 步學術結構化筆記、純本機隔離安全發布。
            </p>
          </div>

          {/* Editorial Philosophy */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-bronze-700 dark:text-bronze-400 mb-3 flex items-center gap-1.5">
              <Feather className="w-3.5 h-3.5" />
              筆記整理原則
            </h4>
            <ul className="text-xs text-ink-600 dark:text-academic-mutedDark space-y-1.5 leading-relaxed">
              <li>• 作者原始觀點與讀者心得嚴格分離</li>
              <li>• 專業定義追溯出處，重要引述標註頁碼</li>
              <li>• 原書案例與自行延伸舉例清楚界定標明</li>
              <li>• 絕不大量抄錄原文，堅持深度內化改寫</li>
            </ul>
          </div>

          {/* Privacy & Safe Publish */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-academic-navy dark:text-academic-navyLight mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              隱私與安全機制
            </h4>
            <p className="text-xs text-ink-600 dark:text-academic-mutedDark leading-relaxed">
              本公開網站採用白名單發布機制。私人書籍（Private）與草稿（Draft）物理隔離於獨立目錄，絕不上傳至公開 GitHub 倉庫或網路搜尋索引。
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-ink-400 dark:text-zinc-500 gap-4">
          <p>© {new Date().getFullYear()} Reading Notes 2.0. Built with Modern Editorial Architecture.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              Academic Knowledge Library
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

