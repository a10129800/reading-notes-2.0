import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ExternalLink,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  BookOpen,
  Sparkles,
  Globe,
  Scale,
  Shield,
  Layers,
  FileSearch,
} from 'lucide-react';
import { CitationItem } from '../types';
import {
  lawDatabaseService,
  LawDatabaseItem,
  LawTabFilter,
} from '../services/lawDatabaseService';

interface LegalMascotWidgetProps {
  citationItems?: CitationItem[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  activeLawId: string | null;
  onSelectLaw: (idOrQuery: string) => void;
}

export type DictFontSize = 'standard' | 'large' | 'xlarge';

// 刑法總則快速章節分組
const GENERAL_CHAPTER_RANGES = [
  { label: '全部總則 (1~99)', min: 1, max: 99 },
  { label: '§ 1~11 法例', min: 1, max: 11 },
  { label: '§ 12~24 責任/阻卻違法', min: 12, max: 24 },
  { label: '§ 25~27 未遂犯', min: 25, max: 27 },
  { label: '§ 28~31 正犯與共犯', min: 28, max: 31 },
  { label: '§ 32~56 刑罰與累犯', min: 32, max: 56 },
  { label: '§ 57~73 刑之酌量加減', min: 57, max: 73 },
  { label: '§ 74~79 緩刑與假釋', min: 74, max: 79 },
  { label: '§ 80~99 時效與保安處分', min: 80, max: 99 },
];

// 刑法分則快速章節分組
const SPECIFIC_CHAPTER_RANGES = [
  { label: '全部分則 (100~357)', min: 100, max: 360 },
  { label: '§ 173~194 公共危險', min: 173, max: 194 },
  { label: '§ 210~220 偽造文書印文', min: 210, max: 220 },
  { label: '§ 221~229 妨害性自主', min: 221, max: 229 },
  { label: '§ 271~276 殺人罪章', min: 271, max: 276 },
  { label: '§ 277~287 傷害罪章', min: 277, max: 287 },
  { label: '§ 296~308 妨害自由', min: 296, max: 308 },
  { label: '§ 309~314 妨害名譽信用', min: 309, max: 314 },
  { label: '§ 320~324 竊盜罪章', min: 320, max: 324 },
  { label: '§ 325~334 搶奪強盜', min: 325, max: 334 },
  { label: '§ 335~345 詐欺背信侵占', min: 335, max: 345 },
];

/**
 * 法律神獸「獬豸」(Xiezhi) 可愛向量插畫
 * 傳說中能辨曲直之正義神獸，頭頂獨角，身穿法袍，代表公平與法治
 */
export const XiezhiMascotSvg: React.FC<{ className?: string }> = ({
  className = 'w-16 h-16',
}) => {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* 獨角漸層 */}
        <linearGradient
          id="hornGrad"
          x1="60"
          y1="5"
          x2="60"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="60%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        {/* 頭部漸層 */}
        <linearGradient
          id="headGrad"
          x1="60"
          y1="20"
          x2="60"
          y2="85"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>
        {/* 法袍漸層 */}
        <linearGradient
          id="robeGrad"
          x1="60"
          y1="75"
          x2="60"
          y2="118"
          gradientUnits="userSpaceOnUse"
        >
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
      <path
        d="M50 82 L60 96 L70 82 L64 80 L60 84 L56 80 Z"
        fill="#FFFFFF"
        stroke="#CBD5E1"
        strokeWidth="1"
      />
      {/* 法袍胸前正義金徽 */}
      <circle cx="60" cy="104" r="4.5" fill="#F59E0B" stroke="#FDE68A" strokeWidth="1.2" />
      <path
        d="M58 104 L62 104 M60 102 L60 106"
        stroke="#FFFFFF"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* 獬豸神獸耳朵 */}
      {/* 左耳 */}
      <path
        d="M34 46 C24 40 20 54 30 62 Z"
        fill="#FDE68A"
        stroke="#D97706"
        strokeWidth="1.5"
      />
      <path d="M32 48 C26 44 24 53 30 58 Z" fill="#FDA4AF" />
      {/* 右耳 */}
      <path
        d="M86 46 C96 40 100 54 90 62 Z"
        fill="#FDE68A"
        stroke="#D97706"
        strokeWidth="1.5"
      />
      <path d="M88 48 C94 44 96 53 90 58 Z" fill="#FDA4AF" />

      {/* 圓潤頭部 */}
      <circle
        cx="60"
        cy="60"
        r="32"
        fill="url(#headGrad)"
        stroke="#D97706"
        strokeWidth="2"
        filter="url(#softShadow)"
      />

      {/* 額頭神獸獨角 (象徵是非分明、剛正不阿) */}
      <path
        d="M60 8 L54 35 C58 37 62 37 66 35 Z"
        fill="url(#hornGrad)"
        stroke="#B45309"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* 獨角紋路與光澤 */}
      <path
        d="M56 26 C58 27 62 27 64 26"
        stroke="#FEF3C7"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M57 18 C59 19 61 19 63 18"
        stroke="#FEF3C7"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* 獨角頂端正義星芒 */}
      <circle cx="60" cy="8" r="2.5" fill="#FFFFFF" />

      {/* 眉毛 */}
      <path
        d="M44 48 C47 46 51 47 52 49"
        stroke="#92400E"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M68 49 C69 47 73 46 76 48"
        stroke="#92400E"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

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
      <path
        d="M54 68 C57 72 63 72 66 68"
        stroke="#78350F"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* 迷你小法槌（右爪拿著） */}
      <g transform="translate(82, 85) rotate(-25)">
        <rect
          x="0"
          y="8"
          width="5"
          height="22"
          rx="2"
          fill="#92400E"
          stroke="#78350F"
          strokeWidth="1"
        />
        <rect
          x="-6"
          y="0"
          width="17"
          height="9"
          rx="2.5"
          fill="#B45309"
          stroke="#78350F"
          strokeWidth="1"
        />
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
  const [tabFilter, setTabFilter] = useState<LawTabFilter>('chapter');
  const [selectedRange, setSelectedRange] = useState<{ min: number; max: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<DictFontSize>('standard');

  const chipBarRef = useRef<HTMLDivElement>(null);

  // 取得全庫合併本章筆記後的法條清單 (共 436 條)
  const fullLawList = useMemo(() => {
    return lawDatabaseService.mergeWithChapterCitations(citationItems);
  }, [citationItems]);

  // 篩選與匹配法條清單
  const filteredList = useMemo(() => {
    let list = lawDatabaseService.filterLaws(fullLawList, searchQuery, tabFilter);

    // 依章節範圍次級過濾 (例如：§ 1~11、§ 12~24 等)
    if (selectedRange && !searchQuery.trim()) {
      list = list.filter((it) => {
        if (!it.lawNo) return false;
        const n = parseInt(it.lawNo, 10);
        return !isNaN(n) && n >= selectedRange.min && n <= selectedRange.max;
      });
    }

    return list;
  }, [fullLawList, searchQuery, tabFilter, selectedRange]);

  // 目前選中的條文
  const currentItem = useMemo(() => {
    if (filteredList.length === 0) return null;
    if (activeLawId) {
      const found = filteredList.find(
        (it) =>
          it.id === activeLawId ||
          it.lawNo === activeLawId ||
          it.lawName.includes(activeLawId) ||
          (it.shortName && it.shortName.includes(activeLawId))
      );
      if (found) return found;
    }
    return filteredList[0];
  }, [activeLawId, filteredList]);

  // 當切換選中條文時，自動橫向捲動使該標籤置中可見
  useEffect(() => {
    if (!currentItem || !chipBarRef.current) return;
    const targetBtn = chipBarRef.current.querySelector(
      `[data-law-id="${currentItem.id}"]`
    ) as HTMLElement;
    if (targetBtn) {
      targetBtn.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentItem?.id]);

  // 目前選中項目的索引
  const currentIndex = useMemo(() => {
    if (!currentItem) return -1;
    return filteredList.findIndex((it) => it.id === currentItem.id);
  }, [filteredList, currentItem]);

  // 切換上一條
  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelectLaw(filteredList[currentIndex - 1].id);
    }
  };

  // 切換下一條
  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < filteredList.length - 1) {
      onSelectLaw(filteredList[currentIndex + 1].id);
    }
  };

  // 點擊捲動按鈕：向左捲動標籤列
  const handleScrollLeft = () => {
    if (chipBarRef.current) {
      chipBarRef.current.scrollBy({ left: -240, behavior: 'smooth' });
    }
  };

  // 點擊捲動按鈕：向右捲動標籤列
  const handleScrollRight = () => {
    if (chipBarRef.current) {
      chipBarRef.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  // 複製條文全文
  const handleCopy = () => {
    if (!currentItem) return;
    const textToCopy = `【${currentItem.lawName} ${currentItem.articleTitle || ''}】\n${currentItem.content}\n（法務部全國法規資料庫）`;
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
    if (isOpen && !activeLawId && filteredList.length > 0) {
      onSelectLaw(filteredList[0].id);
    }
  }, [isOpen, activeLawId, filteredList, onSelectLaw]);

  // 外部法規快速標籤
  const quickExternalTags = [
    { label: '《民法》', query: '民法' },
    { label: '《刑事訴訟法》', query: '刑事訴訟法' },
    { label: '《行政罰法》', query: '行政罰法' },
    { label: '《少年事件處理法》', query: '少年' },
    { label: '《陸海空軍刑法》', query: '陸海空軍刑法' },
    { label: '《毒品危害防制條例》', query: '毒品' },
    { label: '《貪污治罪條例》', query: '貪污' },
    { label: '《洗錢防制法》', query: '洗錢' },
    { label: '《營業秘密法》', query: '營業秘密' },
    { label: '《個人資料保護法》', query: '個資' },
  ];

  const chapterCount = useMemo(() => {
    return fullLawList.filter((it) => it.isChapterCitation).length;
  }, [fullLawList]);

  // 字體大小樣式配置
  const fontStyles = useMemo(() => {
    if (fontSize === 'xlarge') {
      return {
        articleContent: 'text-[19px] sm:text-[20px] leading-[1.9]',
        bookNote: 'text-[16.5px] sm:text-[17.5px] leading-relaxed',
        summary: 'text-[16px]',
        title: 'text-lg sm:text-xl font-bold',
      };
    }
    if (fontSize === 'large') {
      return {
        articleContent: 'text-[17px] sm:text-[18px] leading-[1.85]',
        bookNote: 'text-[15px] sm:text-[16px] leading-relaxed',
        summary: 'text-[14.5px]',
        title: 'text-base sm:text-lg font-bold',
      };
    }
    // standard (升級後基礎即為舒適的 15~16px)
    return {
      articleContent: 'text-[15px] sm:text-[16px] leading-[1.8]',
      bookNote: 'text-[14px] sm:text-[14.5px] leading-relaxed',
      summary: 'text-[13px] sm:text-[13.5px]',
      title: 'text-base font-bold',
    };
  }, [fontSize]);

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
          title="點擊開啟浮動法律小辭典（全庫條文、字體放大、直達條號與資料外法條）"
        >
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-emerald-500 text-emerald-950 dark:text-emerald-100 shadow-lg shadow-emerald-500/20 text-xs font-bold tracking-wide hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors">
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
          className="relative p-1.5 rounded-full bg-gradient-to-br from-amber-50 to-emerald-50 dark:from-slate-800 dark:to-emerald-950 border-2 border-emerald-400 dark:border-emerald-600 shadow-xl shadow-slate-900/15 hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-110 active:scale-95 group focus:outline-none cursor-pointer"
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
      {/* 浮動法律小辭典 (全庫法條與查找資料外法條)                    */}
      {/* ============================================================ */}
      {isOpen && (
        <>
          {/* 背景遮罩 (手機端可輕點背景關閉) */}
          <div
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20 dark:bg-black/50 backdrop-blur-xs transition-opacity sm:hidden"
          />

          <div className="fixed bottom-24 left-2 sm:left-6 z-50 w-[96vw] sm:w-[680px] md:w-[740px] lg:w-[800px] max-h-[88vh] flex flex-col bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl rounded-2xl border-2 border-emerald-500/60 shadow-2xl shadow-emerald-950/25 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
            {/* 辭典頂部標題列 */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 p-0.5 flex items-center justify-center shrink-0">
                  <XiezhiMascotSvg className="w-full h-full" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm sm:text-base text-white tracking-wide">
                      法律小辭典
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400 text-amber-950 font-bold">
                      全庫 436 條文
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/40 text-emerald-100 font-medium">
                      含資料外法條查找
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-emerald-100/90 font-normal">
                    全國法規資料庫官方現行條文 · 研讀筆記與外連直通檢索
                  </p>
                </div>
              </div>

              {/* 右側操作區：字體大小切換 + 官網外連 + 關閉按鈕 */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 辭典專屬字體大小控制按鈕 */}
                <div
                  className="flex items-center bg-black/20 p-0.5 rounded-lg border border-white/20 text-xs shrink-0"
                  title="調整小辭典條文字體大小"
                >
                  <button
                    type="button"
                    onClick={() => setFontSize('standard')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      fontSize === 'standard'
                        ? 'bg-white text-emerald-900 shadow-xs'
                        : 'text-emerald-100 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    標準
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize('large')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      fontSize === 'large'
                        ? 'bg-white text-emerald-900 shadow-xs'
                        : 'text-emerald-100 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    放大
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize('xlarge')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      fontSize === 'xlarge'
                        ? 'bg-white text-emerald-900 shadow-xs'
                        : 'text-emerald-100 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    特大
                  </button>
                </div>

                <a
                  href="https://law.moj.gov.tw/Index.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 text-white text-[11.5px] font-medium transition-colors"
                  title="前往法務部全國法規資料庫首頁"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>全國法規官網</span>
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/20 transition-colors cursor-pointer shrink-0"
                  title="關閉小辭典 (Esc)"
                  aria-label="關閉小辭典"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 分類導航分頁籤 (Tabs) */}
            <div className="flex items-center gap-1.5 px-3 pt-2 pb-1.5 bg-emerald-50/70 dark:bg-slate-900 border-b border-emerald-100 dark:border-emerald-950 overflow-x-auto scrollbar-thin text-xs">
              <button
                type="button"
                onClick={() => {
                  setTabFilter('chapter');
                  setSelectedRange(null);
                }}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                  tabFilter === 'chapter'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-slate-700'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>本章條文 ({chapterCount})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTabFilter('general');
                  setSelectedRange(null);
                }}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                  tabFilter === 'general'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-slate-700'
                }`}
              >
                <Scale className="w-3 h-3 text-emerald-400" />
                <span>刑法總則 (1~99條)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTabFilter('specific');
                  setSelectedRange(null);
                }}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                  tabFilter === 'specific'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-slate-700'
                }`}
              >
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>刑法分則 (100~357條)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTabFilter('external');
                  setSelectedRange(null);
                }}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                  tabFilter === 'external'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                }`}
              >
                <Globe className="w-3 h-3 text-indigo-300" />
                <span>資料外法條 (外部法規)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTabFilter('all');
                  setSelectedRange(null);
                }}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                  tabFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-slate-700'
                }`}
              >
                <Layers className="w-3 h-3 text-slate-400" />
                <span>全部條文 (436)</span>
              </button>
            </div>

            {/* 搜尋列與直達條號選單 */}
            <div className="p-3 border-b border-emerald-100 dark:border-emerald-900/50 bg-slate-50 dark:bg-slate-900 shrink-0 space-y-2">
              <div className="flex items-center gap-2">
                {/* 搜尋框 */}
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜尋條號（如：10、13、271、320）或關鍵字（故意、正當防衛、民法、刑訴）..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      title="清除搜尋關鍵字"
                      aria-label="清除搜尋"
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 🎯 直達條號快速下拉選單 (保證第 9 條後的任意條號隨時一點即達！) */}
                <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
                    🎯 直達：
                  </span>
                  <select
                    value={currentItem?.id || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        onSelectLaw(e.target.value);
                      }
                    }}
                    className="bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[170px] truncate"
                    title="從下拉清單直接選取任意條號"
                  >
                    {filteredList.map((item) => (
                      <option key={item.id} value={item.id} className="dark:bg-slate-800">
                        {item.shortName || item.lawName}{' '}
                        {item.articleTitle ? `【${item.articleTitle}】` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 章節分組快捷切換按鈕（在總則或分則分頁時顯示，解決龐大條號捲動問題） */}
              {tabFilter === 'general' && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin text-[11px]">
                  <span className="text-slate-400 font-medium shrink-0">章節快選：</span>
                  {GENERAL_CHAPTER_RANGES.map((rg) => {
                    const isActive =
                      selectedRange?.min === rg.min && selectedRange?.max === rg.max;
                    return (
                      <button
                        key={rg.label}
                        type="button"
                        onClick={() => {
                          if (isActive) {
                            setSelectedRange(null);
                          } else {
                            setSelectedRange({ min: rg.min, max: rg.max });
                          }
                        }}
                        className={`px-2 py-0.5 rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-emerald-700 text-white font-bold'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50'
                        }`}
                      >
                        {rg.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {tabFilter === 'specific' && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin text-[11px]">
                  <span className="text-slate-400 font-medium shrink-0">重要罪章：</span>
                  {SPECIFIC_CHAPTER_RANGES.map((rg) => {
                    const isActive =
                      selectedRange?.min === rg.min && selectedRange?.max === rg.max;
                    return (
                      <button
                        key={rg.label}
                        type="button"
                        onClick={() => {
                          if (isActive) {
                            setSelectedRange(null);
                          } else {
                            setSelectedRange({ min: rg.min, max: rg.max });
                          }
                        }}
                        className={`px-2 py-0.5 rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-emerald-700 text-white font-bold'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50'
                        }`}
                      >
                        {rg.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 橫向條號快捷標籤列（含左右滾動控制按鈕與滑鼠滾輪支援） */}
              <div className="relative flex items-center gap-1 pt-0.5">
                {/* 左滾動箭頭按鈕 */}
                <button
                  type="button"
                  onClick={handleScrollLeft}
                  className="p-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-xs shrink-0 cursor-pointer"
                  title="向左捲動條號列表"
                  aria-label="向左捲動條號"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* 條號標籤滾動容器 (支援滑鼠滾輪滾動與拖曳) */}
                <div
                  ref={chipBarRef}
                  onWheel={(e) => {
                    if (e.deltaY !== 0) {
                      e.currentTarget.scrollLeft += e.deltaY;
                    }
                  }}
                  className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin flex-1 scroll-smooth"
                >
                  {filteredList.map((item) => {
                    const isSelected = currentItem?.id === item.id;
                    const label = item.shortName || item.lawName;

                    return (
                      <button
                        key={item.id}
                        data-law-id={item.id}
                        type="button"
                        onClick={() => onSelectLaw(item.id)}
                        className={`px-2.5 py-1 rounded-md text-[11.5px] sm:text-xs font-bold font-mono whitespace-nowrap shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs scale-105 ring-2 ring-emerald-400'
                            : item.isChapterCitation
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-100'
                            : item.category === 'external'
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                        title={`${item.lawName} ${item.articleTitle || ''}`}
                      >
                        {item.isChapterCitation && (
                          <span className="text-[10px] text-amber-500">★</span>
                        )}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 右滾動箭頭按鈕 */}
                <button
                  type="button"
                  onClick={handleScrollRight}
                  className="p-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-xs shrink-0 cursor-pointer"
                  title="向右捲動條號列表（查看第 10 條以後之完整條文）"
                  aria-label="向右捲動條號"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 條文內容呈現區塊 (可垂直滾動) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs sm:text-sm">
              {/* 查找資料外法條專區 (當搜尋中或切換至 external 標籤或無匹配時突出顯示) */}
              {(tabFilter === 'external' || searchQuery.trim() !== '') && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 dark:from-slate-800 dark:via-indigo-950/40 dark:to-slate-800 border-2 border-indigo-300 dark:border-indigo-700/80 shadow-xs space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 text-xs sm:text-sm">
                      <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>查找資料庫外法條 · 全國法規直通車</span>
                    </span>

                    <a
                      href={lawDatabaseService.getMojSearchUrl(searchQuery || '刑法')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      <FileSearch className="w-3.5 h-3.5" />
                      <span>
                        至全國法規資料庫檢索 {searchQuery ? `「${searchQuery}」` : '外部法條'}
                      </span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  </div>

                  {/* 常用資料外法規捷徑標籤 */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      常用外部法規：
                    </span>
                    {quickExternalTags.map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => {
                          setTabFilter('all');
                          setSelectedRange(null);
                          setSearchQuery(t.query);
                        }}
                        className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 text-xs text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentItem ? (
                <>
                  {/* 當前條目標題卡片 */}
                  <div className="p-4 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-xs space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* 條目分類小膠囊 */}
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-bold ${
                            currentItem.isChapterCitation
                              ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200'
                              : currentItem.category === 'external'
                              ? 'bg-indigo-200 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-200'
                              : 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'
                          }`}
                        >
                          {currentItem.isChapterCitation
                            ? '★ 本章重點導引'
                            : currentItem.lawCategoryName || '全國法規'}
                        </span>

                        <h4 className={`${fontStyles.title} text-emerald-950 dark:text-emerald-100`}>
                          {currentItem.lawName}
                        </h4>

                        {currentItem.articleTitle && (
                          <span className="font-semibold text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm">
                            【{currentItem.articleTitle}】
                          </span>
                        )}
                      </div>

                      {currentItem.page && (
                        <span className="text-xs px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-mono font-bold">
                          {currentItem.page}
                        </span>
                      )}
                    </div>

                    {/* 編與章節資訊 */}
                    {(currentItem.part || currentItem.chapter) && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {currentItem.part} {currentItem.chapter && `❯ ${currentItem.chapter}`}
                      </p>
                    )}

                    {currentItem.summary && (
                      <p className={`${fontStyles.summary} text-emerald-900/95 dark:text-emerald-200/95 font-medium pt-0.5`}>
                        {currentItem.summary}
                      </p>
                    )}
                  </div>

                  {/* 全國法規資料庫現行條文卡片 */}
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700/60 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>全國法規資料庫官方現行條文：</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                          title="複製此法條條文"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-bold">已複製</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>複製條文</span>
                            </>
                          )}
                        </button>

                        {currentItem.lawUrl && (
                          <a
                            href={currentItem.lawUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
                            title="開啟此條的全國法規資料庫網頁"
                          >
                            <span>全國法規線上檢索</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                      <p className={`text-slate-900 dark:text-slate-100 font-mono ${fontStyles.articleContent} whitespace-pre-line select-text`}>
                        {currentItem.content}
                      </p>
                    </div>
                  </div>

                  {/* 本書研讀導引與表格對應 */}
                  {currentItem.bookNote && (
                    <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-1.5">
                      <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-xs sm:text-sm">
                        <span>💡 本書研讀導引與表格對應：</span>
                      </span>
                      <p className={`text-amber-950 dark:text-amber-100 ${fontStyles.bookNote} whitespace-pre-line pl-1`}>
                        {currentItem.bookNote}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 space-y-3">
                  <p className="text-sm sm:text-base font-medium">
                    本地資料庫未找到包含「{searchQuery}」的法條
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400">
                    可點擊下方按鈕直接連線至全國法規資料庫或司法院檢索：
                  </p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <a
                      href={lawDatabaseService.getMojSearchUrl(searchQuery)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      <span>全國法規資料庫線上查詢</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={lawDatabaseService.getJudicialSearchUrl(searchQuery)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-medium text-xs sm:text-sm transition-colors"
                    >
                      <span>司法院裁判書系統</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* 底部前後切換與統計 */}
            <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between text-xs sm:text-sm shrink-0">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex <= 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>上一條</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-bold">
                  條文 {currentIndex >= 0 ? currentIndex + 1 : 0} / {filteredList.length}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                  庫存共 {fullLawList.length} 條
                </span>
              </div>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex < 0 || currentIndex >= filteredList.length - 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <span>下一條</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
