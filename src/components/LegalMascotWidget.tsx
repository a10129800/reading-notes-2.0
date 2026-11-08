import React, { useState, useMemo, useEffect } from 'react';
import { ExternalLink, X, Search, ChevronLeft, ChevronRight, Copy, Check, BookOpen } from 'lucide-react';
import { CitationItem } from '../types';

interface LegalMascotWidgetProps {
  citationItems?: CitationItem[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  activeLawId: string | null;
  onSelectLaw: (idOrQuery: string) => void;
}

/**
 * 法律神獸「獬豸」(Xiezhi) 可愛向量插畫
 * 傳說中能辨曲直之正義神獸，頭頂獨角，身穿法袍，代表公平與法治
 */
export const XiezhiMascotSvg: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* 獨角漸層 */}
        <linearGradient id="hornGrad" x1="60" y1="5" x2="60" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="60%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        {/* 頭部漸層 */}
        <linearGradient id="headGrad" x1="60" y1="20" x2="60" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>
        {/* 法袍漸層 */}
        <linearGradient id="robeGrad" x1="60" y1="75" x2="60" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        {/* 陰影效果 */}
        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* 底部微影 */}
      <ellipse cx="60" cy="115" rx="36" ry="5" fill="#000000" fillOpacity="0.18" />

      {/* 法袍身體 */}
      <path
        d="M32 86 C28 98 25 112 24 116 C38 118 82 118 96 116 C95 112 92 98 88 86 Z"
        fill="url(#robeGrad)"
        stroke="#0284C7"
        strokeWidth="1.5"
      />

      {/* 法袍白色領巾 (領片) */}
      <path d="M50 82 L60 96 L70 82 L64 80 L60 84 L56 80 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
      {/* 法袍胸前正義金徽 */}
      <circle cx="60" cy="104" r="4.5" fill="#F59E0B" stroke="#FDE68A" strokeWidth="1.2" />
      <path d="M58 104 L62 104 M60 102 L60 106" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />

      {/* 獬豸神獸耳朵 */}
      {/* 左耳 */}
      <path d="M34 46 C24 40 20 54 30 62 Z" fill="#FDE68A" stroke="#D97706" strokeWidth="1.5" />
      <path d="M32 48 C26 44 24 53 30 58 Z" fill="#FDA4AF" />
      {/* 右耳 */}
      <path d="M86 46 C96 40 100 54 90 62 Z" fill="#FDE68A" stroke="#D97706" strokeWidth="1.5" />
      <path d="M88 48 C94 44 96 53 90 58 Z" fill="#FDA4AF" />

      {/* 圓潤頭部 */}
      <circle cx="60" cy="60" r="32" fill="url(#headGrad)" stroke="#D97706" strokeWidth="2" filter="url(#softShadow)" />

      {/* 額頭神獸獨角 (象徵是非分明、剛正不阿) */}
      <path
        d="M60 8 L54 35 C58 37 62 37 66 35 Z"
        fill="url(#hornGrad)"
        stroke="#B45309"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* 獨角紋路與光澤 */}
      <path d="M56 26 C58 27 62 27 64 26" stroke="#FEF3C7" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M57 18 C59 19 61 19 63 18" stroke="#FEF3C7" strokeWidth="1.2" strokeLinecap="round" />
      {/* 獨角頂端正義星芒 */}
      <circle cx="60" cy="8" r="2.5" fill="#FFFFFF" />

      {/* 眉毛 */}
      <path d="M44 48 C47 46 51 47 52 49" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M68 49 C69 47 73 46 76 48" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round" />

      {/* 大眼睛 (水汪汪正義萌眼) */}
      {/* 左眼 */}
      <ellipse cx="48" cy="58" rx="6" ry="7.5" fill="#1E293B" />
      <circle cx="46" cy="55" r="2.5" fill="#FFFFFF" />
      <circle cx="50.5" cy="61" r="1.2" fill="#FFFFFF" />
      {/* 右眼 */}
      <ellipse cx="72" cy="58" rx="6" ry="7.5" fill="#1E293B" />
      <circle cx="70" cy="55" r="2.5" fill="#FFFFFF" />
      <circle cx="74.5" cy="61" r="1.2" fill="#FFFFFF" />

      {/* 腮紅 */}
      <ellipse cx="40" cy="66" rx="4.5" ry="2.5" fill="#FB7185" fillOpacity="0.6" />
      <ellipse cx="80" cy="66" rx="4.5" ry="2.5" fill="#FB7185" fillOpacity="0.6" />

      {/* 鼻子 */}
      <ellipse cx="60" cy="63" rx="2.5" ry="1.8" fill="#B45309" />

      {/* 萌萌微笑嘴巴 */}
      <path d="M54 68 C57 72 63 72 66 68" stroke="#78350F" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* 迷你小法槌（右爪拿著） */}
      <g transform="translate(82, 85) rotate(-25)">
        <rect x="0" y="8" width="5" height="22" rx="2" fill="#92400E" stroke="#78350F" strokeWidth="1" />
        <rect x="-6" y="0" width="17" height="9" rx="2.5" fill="#B45309" stroke="#78350F" strokeWidth="1" />
        <line x1="-3" y1="0" x2="-3" y2="9" stroke="#FDE047" strokeWidth="1.5" />
        <line x1="8" y1="0" x2="8" y2="9" stroke="#FDE047" strokeWidth="1.5" />
      </g>
    </svg>
  );
};

export const LegalMascotWidget: React.FC<LegalMascotWidgetProps> = ({
  citationItems = [],
  isOpen,
  onToggle,
  onClose,
  activeLawId,
  onSelectLaw,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // 篩選與匹配法條清單
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return citationItems;
    const q = searchQuery.trim().toLowerCase();
    return citationItems.filter((item) => {
      return (
        item.lawName.toLowerCase().includes(q) ||
        (item.articleTitle && item.articleTitle.toLowerCase().includes(q)) ||
        (item.summary && item.summary.toLowerCase().includes(q)) ||
        item.content.toLowerCase().includes(q)
      );
    });
  }, [citationItems, searchQuery]);

  // 目前選中的條文
  const currentItem = useMemo(() => {
    if (!citationItems || citationItems.length === 0) return null;
    if (activeLawId) {
      const found = citationItems.find(
        (it) =>
          it.id === activeLawId ||
          it.lawName.includes(activeLawId) ||
          (it.articleTitle && it.articleTitle.includes(activeLawId))
      );
      if (found) return found;
    }
    return filteredList[0] || citationItems[0];
  }, [citationItems, activeLawId, filteredList]);

  // 目前選中項目的索引
  const currentIndex = useMemo(() => {
    if (!currentItem) return -1;
    return citationItems.findIndex((it) => it.id === currentItem.id);
  }, [citationItems, currentItem]);

  // 切換上一條
  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelectLaw(citationItems[currentIndex - 1].id);
    }
  };

  // 切換下一條
  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < citationItems.length - 1) {
      onSelectLaw(citationItems[currentIndex + 1].id);
    }
  };

  // 複製條文全文
  const handleCopy = () => {
    if (!currentItem) return;
    const textToCopy = `【${currentItem.lawName} ${currentItem.articleTitle || ''}】\n${currentItem.content}\n（全國法規資料庫現行條文）`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 監聽 Escape 鍵關閉小辭典
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 當無項目時自動設定第一個
  useEffect(() => {
    if (isOpen && !activeLawId && citationItems.length > 0) {
      onSelectLaw(citationItems[0].id);
    }
  }, [isOpen, activeLawId, citationItems, onSelectLaw]);

  return (
    <>
      {/* ============================================================ */}
      {/* 浮動法律動物 (獬豸) 懸浮按鈕與對話框 (常駐於畫面左下角)       */}
      {/* ============================================================ */}
      <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start select-none">
        {/* 對話框：法律小辭典點這邊 */}
        <div
          onClick={onToggle}
          className="relative mb-2 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 group"
          title="點擊開啟浮動法律小辭典"
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-emerald-500 text-emerald-950 dark:text-emerald-100 shadow-lg shadow-emerald-500/20 text-xs font-bold tracking-wide hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors">
            <span className="text-amber-500 text-sm animate-pulse">💡</span>
            <span>法律小辭典點這邊</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          {/* 對話框向下小箭頭 */}
          <div className="absolute left-6 -bottom-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-r-2 border-b-2 border-emerald-500 rotate-45 transform" />
        </div>

        {/* 法律動物按鈕 (獬豸) */}
        <button
          type="button"
          onClick={onToggle}
          className="relative p-1.5 rounded-full bg-gradient-to-br from-amber-50 to-emerald-50 dark:from-slate-800 dark:to-emerald-950 border-2 border-emerald-400 dark:border-emerald-600 shadow-xl shadow-slate-900/15 hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-110 active:scale-95 group focus:outline-none"
          title={isOpen ? '收合法律小辭典' : '開啟法律小辭典（法獸獬豸）'}
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
            <XiezhiMascotSvg className="w-full h-full drop-shadow-md transition-transform group-hover:rotate-6 duration-300" />
          </div>

          {/* 右下角迷你法典徽章 */}
          <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-md flex items-center gap-0.5 border border-white dark:border-slate-800">
            ⚖️ 辭典
          </span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 浮動法律小辭典 (Floating Legal Dictionary Popover)           */}
      {/* ============================================================ */}
      {isOpen && (
        <>
          {/* 背景遮罩 (手機端或需要時可輕點背景關閉) */}
          <div
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20 dark:bg-black/50 backdrop-blur-xs transition-opacity sm:hidden"
          />

          <div
            className="fixed bottom-24 left-4 sm:left-6 z-50 w-[94vw] sm:w-[500px] md:w-[540px] max-h-[80vh] flex flex-col bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl rounded-2xl border-2 border-emerald-500/50 shadow-2xl shadow-emerald-950/20 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
          >
            {/* 辭典頂部標題列 */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 text-white shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 p-0.5 flex items-center justify-center">
                  <XiezhiMascotSvg className="w-full h-full" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-white tracking-wide">
                      法律小辭典
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/40 text-emerald-100 font-medium">
                      浮動即時對照
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-200/90 font-normal">
                    全國法規資料庫現行條文與對應法理
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <a
                  href="https://law.moj.gov.tw/Index.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/15 hover:bg-white/25 text-white text-[11px] font-medium transition-colors"
                  title="開啟全國法規資料庫首頁"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span className="hidden sm:inline">法規資料庫</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-white/20 transition-colors"
                  title="關閉小辭典"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 條號快速搜尋列 */}
            <div className="p-3 border-b border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-slate-900 shrink-0 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜尋條號（如：12、15、25）或關鍵字..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 橫向可滾動條號快捷標籤列 */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {citationItems.map((item) => {
                  const isSelected = currentItem?.id === item.id;
                  // 擷取條號文字，如 "§ 12"
                  const shortMatch = item.lawName.match(/第\s*(\d+)\s*條/);
                  const shortLabel = shortMatch ? `§ ${shortMatch[1]}` : item.lawName;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectLaw(item.id)}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold font-mono whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs scale-105'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-slate-700'
                      }`}
                      title={`${item.lawName} ${item.articleTitle || ''}`}
                    >
                      {shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 條文內容呈現區塊 (可垂直滾動) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
              {currentItem ? (
                <>
                  {/* 當前條目標題卡片 */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                          {currentIndex + 1}
                        </span>
                        <h4 className="font-bold text-sm text-emerald-950 dark:text-emerald-100">
                          {currentItem.lawName}
                        </h4>
                        {currentItem.articleTitle && (
                          <span className="font-semibold text-emerald-800 dark:text-emerald-300 text-xs">
                            【{currentItem.articleTitle}】
                          </span>
                        )}
                      </div>

                      {currentItem.page && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-mono font-medium">
                          {currentItem.page}
                        </span>
                      )}
                    </div>

                    {currentItem.summary && (
                      <p className="text-[11.5px] text-emerald-900/90 dark:text-emerald-200/90 font-medium pl-7">
                        {currentItem.summary}
                      </p>
                    )}
                  </div>

                  {/* 全國法規資料庫現行條文卡片 */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700/60 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>全國法規資料庫現行條文：</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                          title="複製此法條條文"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600 font-bold">已複製</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>複製條文</span>
                            </>
                          )}
                        </button>

                        {currentItem.lawUrl && (
                          <a
                            href={currentItem.lawUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
                            title="開啟此條的全國法規資料庫網頁"
                          >
                            <span>線上檢索</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                      <p className="text-slate-900 dark:text-slate-100 font-mono text-[12px] leading-relaxed whitespace-pre-line select-text">
                        {currentItem.content}
                      </p>
                    </div>
                  </div>

                  {/* 本書研讀導引與表格對應 */}
                  {currentItem.bookNote && (
                    <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-1">
                      <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-xs">
                        <span>💡 本書研讀導引與表格對應：</span>
                      </span>
                      <p className="text-amber-950 dark:text-amber-100 leading-relaxed whitespace-pre-line pl-1 text-[11.5px]">
                        {currentItem.bookNote}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <p>未找到符合的法條資料</p>
                </div>
              )}
            </div>

            {/* 底部前後切換與統計 */}
            <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between text-xs shrink-0">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex <= 0}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>上一條</span>
              </button>

              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                條文 {currentIndex >= 0 ? currentIndex + 1 : 0} / {citationItems.length}
              </span>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex < 0 || currentIndex >= citationItems.length - 1}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <span>下一條</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
