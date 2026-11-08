import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, X, Copy, Check, BookOpen } from 'lucide-react';
import { CitationItem } from '../types';

export interface LawFloatingPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  targetRect: DOMRect | null;
  item: CitationItem | null;
  onOpenFullDictionary?: () => void;
}

export const LawFloatingPopover: React.FC<LawFloatingPopoverProps> = ({
  isOpen,
  onClose,
  targetRect,
  item,
  onOpenFullDictionary,
}) => {
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 監聽點擊外部與 Escape 鍵關閉（不使用阻擋性全螢幕遮罩，保持頁面流暢可點選其他條號）
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleDocumentClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // 若點擊的是另一個法條按鈕，由該按鈕的 onClick 直接接管切換
        const isLawBadge = (e.target as HTMLElement)?.closest?.('button[title*="查看全國法規"]');
        if (!isLawBadge) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(() => {
      document.addEventListener('click', handleDocumentClick);
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item || !targetRect) return null;

  // 計算浮動窗格定位
  const POPOVER_WIDTH = Math.min(440, typeof window !== 'undefined' ? window.innerWidth - 24 : 440);
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;

  // 水平置中於目標按鈕，並確保不超出螢幕左右邊界
  let left = targetRect.left + targetRect.width / 2 - POPOVER_WIDTH / 2;
  left = Math.max(12, Math.min(windowWidth - POPOVER_WIDTH - 12, left));

  // 計算垂直位置：優先向上浮動，若上方空間不足 (例如小於 240px) 則向下浮動
  const spaceAbove = targetRect.top;
  const isAbove = spaceAbove >= 240;

  // 小箭頭水平位置 (相對於浮動窗格內部)
  const arrowLeft = Math.max(20, Math.min(POPOVER_WIDTH - 20, targetRect.left + targetRect.width / 2 - left));

  // 複製條文全文
  const handleCopy = () => {
    const textToCopy = `【${item.lawName} ${item.articleTitle || ''}】\n${item.content}\n（法務部全國法規資料庫）`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={popoverRef}
      style={{
        left: `${left}px`,
        ...(isAbove
          ? { bottom: `${window.innerHeight - targetRect.top + 10}px` }
          : { top: `${targetRect.bottom + 10}px` }),
        width: `${POPOVER_WIDTH}px`,
      }}
      className="fixed z-50 flex flex-col bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl rounded-2xl border-2 border-emerald-500 shadow-2xl shadow-emerald-950/25 overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-text"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.lawName} 浮動窗格`}
    >
      {/* 窗格頂部標題列 */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap flex-1 mr-2">
          <span className="text-sm">⚖️</span>
          <span className="font-bold text-xs tracking-wide">
            {item.lawName}
          </span>
          {item.articleTitle && (
            <span className="font-semibold text-[11px] text-emerald-100">
              【{item.articleTitle}】
            </span>
          )}
          {item.page && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20 text-emerald-100 font-mono">
              {item.page}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-emerald-100 hover:text-white hover:bg-white/20 transition-colors cursor-pointer shrink-0"
          title="關閉浮動窗格 (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 窗格主要內容區塊 (最多 60vh 可滾動) */}
      <div className="p-3.5 space-y-3 max-h-[60vh] overflow-y-auto text-xs scrollbar-thin">
        {/* 全國法規資料庫現行條文 */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>全國法規資料庫現行條文：</span>
            </span>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-[10.5px] transition-colors cursor-pointer"
              title="複製條文"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600 font-bold">已複製</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>複製</span>
                </>
              )}
            </button>
          </div>

          <p className="text-slate-900 dark:text-slate-100 font-mono text-[12px] leading-relaxed whitespace-pre-line pl-1">
            {item.content}
          </p>
        </div>

        {/* 本書研讀導引與表格對應 */}
        {item.bookNote && (
          <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-1">
            <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1 text-[11px]">
              <span>💡 本書研讀導引與表格對應：</span>
            </span>
            <p className="text-amber-950 dark:text-amber-100 leading-relaxed whitespace-pre-line pl-1 text-[11.5px]">
              {item.bookNote}
            </p>
          </div>
        )}
      </div>

      {/* 窗格底部快捷列 */}
      <div className="px-3.5 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-[11px] shrink-0">
        {item.lawUrl ? (
          <a
            href={item.lawUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
            title="至法務部全國法規資料庫官網檢索本條"
          >
            <span>全國法規官網條文</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-slate-400">法務部全國法規資料庫</span>
        )}

        {onOpenFullDictionary && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFullDictionary();
            }}
            className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors cursor-pointer"
          >
            <span>開啟小辭典總覽</span>
            <span>→</span>
          </button>
        )}
      </div>

      {/* 指向按鈕的小箭頭 */}
      <div
        style={{ left: `${arrowLeft}px` }}
        className={`absolute w-3.5 h-3.5 bg-white dark:bg-slate-900 border-emerald-500 transform rotate-45 pointer-events-none ${
          isAbove
            ? '-bottom-[7px] border-r-2 border-b-2'
            : '-top-[7px] border-l-2 border-t-2'
        }`}
      />
    </div>
  );
};
