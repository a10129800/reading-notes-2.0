import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Book, ChapterDetail, ChapterMeta } from '../types';
import { publicDataService } from '../services/publicDataService';
import { useTheme } from '../context/ThemeContext';
import { FontSizeControl } from '../components/FontSizeControl';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  Share2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Printer,
  Quote,
  Layers,
  ArrowUp,
  FileText,
  Compass,
  Sparkles,
  HelpCircle,
  Scale,
  Brain,
  ListOrdered,
  ExternalLink
} from 'lucide-react';

export const ChapterReaderPage: React.FC = () => {
  const { bookId, chapterId } = useParams<{ bookId: string; chapterId: string }>();
  const navigate = useNavigate();
  const { fontSize } = useTheme();

  const [book, setBook] = useState<Book | null>(null);
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);

  // Load book & chapter data
  useEffect(() => {
    if (!bookId || !chapterId) return;
    setLoading(true);
    let mounted = true;

    Promise.all([
      publicDataService.getBook(bookId),
      publicDataService.getChapter(bookId, chapterId),
    ]).then(([b, ch]) => {
      if (mounted) {
        setBook(b);
        setChapter(ch);
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    return () => { mounted = false; };
  }, [bookId, chapterId]);

  // Compute previous and next chapter
  const { prevChapter, nextChapter, currentIndex } = useMemo(() => {
    if (!book || !book.chapters) {
      return { prevChapter: null, nextChapter: null, currentIndex: -1 };
    }
    const idx = book.chapters.findIndex(c => c.id === chapterId);
    return {
      prevChapter: idx > 0 ? book.chapters[idx - 1] : null,
      nextChapter: idx >= 0 && idx < book.chapters.length - 1 ? book.chapters[idx + 1] : null,
      currentIndex: idx,
    };
  }, [book, chapterId]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fontClass = {
    normal: 'text-base leading-relaxed',
    large: 'text-lg leading-loose',
    xlarge: 'text-xl leading-loose',
  }[fontSize];

  if (loading) {
    return <div className="p-24 text-center text-ink-400">載入章節筆記中...</div>;
  }

  if (!book || !chapter) {
    return (
      <div className="p-16 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold">找不到此章節內容</h2>
        <Link
          to={bookId ? `/books/${bookId}` : '/books'}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-academic-navy text-paper-50 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> 返回書籍目錄
        </Link>
      </div>
    );
  }

  const sections = chapter.sections;

  return (
    <div className="relative">
      {/* Top sticky utility ribbon */}
      <div className="no-print sticky top-16 z-40 bg-paper-100/95 dark:bg-academic-bgDark/95 backdrop-blur-sm border-b border-academic-borderLight dark:border-academic-borderDark py-2.5 px-4 mb-6 -mx-4 sm:-mx-6 lg:-mx-8 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-2 text-xs truncate max-w-[50%]">
          <Link
            to={`/books/${book.id}`}
            className="text-ink-500 hover:text-bronze-700 dark:text-academic-mutedDark dark:hover:text-bronze-400 truncate flex items-center gap-1 font-serif"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{book.title}</span>
          </Link>
          {chapter.parentChapterId && book.chapters?.find(c => c.id === chapter.parentChapterId) && (
            <>
              <span className="text-ink-300">/</span>
              <Link
                to={`/books/${book.id}/${chapter.parentChapterId}`}
                className="text-ink-500 hover:text-bronze-700 dark:text-academic-mutedDark dark:hover:text-bronze-400 truncate font-serif"
              >
                {book.chapters.find(c => c.id === chapter.parentChapterId)?.title}
              </Link>
            </>
          )}
          <span className="text-ink-300">/</span>
          <span className="text-ink-900 dark:text-ink-100 font-medium truncate font-serif">
            {chapter.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <FontSizeControl />
          <button
            onClick={handleShare}
            className="p-1.5 rounded-md border border-academic-borderLight dark:border-academic-borderDark bg-paper-50 dark:bg-ink-800 text-ink-700 dark:text-ink-200 hover:bg-paper-200 text-xs flex items-center gap-1"
            title="複製章節連結"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">分享</span>
          </button>
          <button
            onClick={handlePrint}
            className="p-1.5 rounded-md border border-academic-borderLight dark:border-academic-borderDark bg-paper-50 dark:bg-ink-800 text-ink-700 dark:text-ink-200 hover:bg-paper-200 text-xs flex items-center gap-1"
            title="列印 / 匯出 PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">列印</span>
          </button>
        </div>
      </div>

      {/* 3-Column Layout Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: TOC (3 cols) */}
        <aside className="no-print lg:col-span-3 sticky top-32 space-y-4 max-h-[calc(100vh-10rem)] overflow-y-auto pr-2">
          <div className="bg-paper-50 dark:bg-academic-cardDark p-4 rounded-xl border border-academic-borderLight dark:border-academic-borderDark">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-academic-borderLight dark:border-academic-borderDark">
              <span className="font-serif text-xs font-bold uppercase tracking-wider text-bronze-700 dark:text-bronze-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                原書目錄結構
              </span>
              <span className="text-[11px] font-mono text-ink-400">
                {currentIndex + 1} / {book.chapters?.length || 0}
              </span>
            </div>

            <nav className="space-y-1.5">
              {book.chapters?.map((ch, idx) => {
                const isActive = ch.id === chapter.id;
                const isChild = (ch.level && ch.level > 1) || Boolean(ch.parentChapterId);
                return (
                  <Link
                    key={ch.id}
                    to={`/books/${book.id}/${ch.id}`}
                    className={`block px-3 py-2 rounded-lg transition-all ${
                      isChild
                        ? 'ml-4 pl-3.5 border-l-2 border-academic-borderLight dark:border-academic-borderDark text-xs font-medium'
                        : 'mt-2.5 first:mt-0 text-sm font-bold font-serif'
                    } ${
                      isActive
                        ? 'bg-bronze-50 dark:bg-bronze-950/60 text-bronze-800 dark:text-bronze-300 border-l-2 border-bronze-600 font-semibold shadow-xs'
                        : isChild
                          ? 'text-ink-600 dark:text-ink-400 hover:bg-paper-200 dark:hover:bg-ink-800'
                          : 'text-ink-950 dark:text-ink-100 hover:bg-paper-200 dark:hover:bg-ink-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isChild ? (
                        <span className="text-bronze-600 dark:text-bronze-400 font-mono text-xs select-none shrink-0 font-bold">
                          └─
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-bronze-100/80 dark:bg-bronze-950/80 text-bronze-800 dark:text-bronze-300 shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                      )}
                      <span className={`truncate ${isChild ? 'text-xs font-medium' : 'text-sm font-bold'}`}>
                        {ch.title}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Center Column: 8-Section Article (6 cols) */}
        <main className={`lg:col-span-6 space-y-10 ${fontClass}`}>
          {/* Chapter Main Header */}
          <div className="border-b border-academic-borderLight dark:border-academic-borderDark pb-6">
            <div className="flex items-center gap-2 text-xs font-mono text-bronze-700 dark:text-bronze-400 font-semibold uppercase mb-2">
              <span>第 {currentIndex + 1} 篇章</span>
              {chapter.readingTimeMinutes && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    預計閱讀 {chapter.readingTimeMinutes} 分鐘
                  </span>
                </>
              )}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-ink-950 dark:text-ink-50 leading-tight">
              {chapter.title}
            </h1>
            {chapter.subtitle && (
              <p className="font-serif italic text-base text-ink-500 dark:text-academic-mutedDark mt-2">
                {chapter.subtitle}
              </p>
            )}
          </div>

          {/* Section 01: 章節導讀 */}
          <section id="section-01" className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm font-bold font-serif text-bronze-700 dark:text-bronze-400 uppercase tracking-wide">
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-bronze-100 dark:bg-bronze-950/80">01</span>
              章節導讀
            </div>
            <div className="p-5 rounded-xl bg-paper-100 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark">
              <h3 className="font-serif font-bold text-sm text-ink-900 dark:text-ink-100 mb-2">
                【本章背景介紹】
              </h3>
              <p className="text-ink-700 dark:text-ink-300 leading-relaxed mb-4 whitespace-pre-line">
                {sections.introduction.overview}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-academic-borderLight dark:border-academic-borderDark text-xs">
                {/* 🎯 學習目標 Card */}
                <div className="p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 shadow-xs space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-amber-500 text-white shadow-xs">
                      🎯 學習目標
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-amber-950 dark:text-amber-100 font-medium">
                    {sections.introduction.learningGoals.map((g, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0 mt-0.5">•</span>
                        <span className="leading-relaxed">{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ❓ 核心探討問題 Card */}
                <div className="p-4 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700/60 shadow-xs space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-blue-600 text-white shadow-xs">
                      ❓ 核心探討問題
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-blue-950 dark:text-blue-100 font-medium">
                    {sections.introduction.coreQuestions.map((q, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 font-bold shrink-0 mt-0.5">•</span>
                        <span className="leading-relaxed">{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 02: 核心摘要 */}
          <section id="section-02" className="space-y-4 pt-4 border-t border-academic-borderLight dark:border-academic-borderDark">
            <div className="flex items-center gap-2 text-sm font-bold font-serif text-bronze-700 dark:text-bronze-400 uppercase tracking-wide">
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-bronze-100 dark:bg-bronze-950/80">02</span>
              核心摘要
            </div>
            <div className="space-y-4 text-ink-800 dark:text-ink-200">
              <div className="bg-amber-50/70 dark:bg-amber-950/20 p-4 rounded-lg border-l-4 border-amber-600">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase mb-1">
                  作者主要論述 (Main Thesis)
                </h4>
                <p className="font-serif italic font-medium text-ink-900 dark:text-ink-100 whitespace-pre-line">
                  {sections.summary.mainArgument}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-serif font-bold text-sm text-ink-900 dark:text-ink-100">
                  章節內容整理
                </h4>
                <p className="text-ink-700 dark:text-ink-300 leading-relaxed whitespace-pre-line">
                  {sections.summary.contentDigest}
                </p>
              </div>

              <div>
                <h4 className="font-serif font-bold text-sm text-ink-900 dark:text-ink-100 mb-2">
                  重要觀點條列
                </h4>
                <ul className="space-y-1.5 text-sm text-ink-700 dark:text-ink-300">
                  {sections.summary.keyPoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-bronze-600 shrink-0 mt-2" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Section 03: 專業知識 */}
          <section id="section-03" className="space-y-4 pt-4 border-t border-academic-borderLight dark:border-academic-borderDark">
            <div className="flex items-center gap-2 text-sm font-bold font-serif text-bronze-700 dark:text-bronze-400 uppercase tracking-wide">
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-bronze-100 dark:bg-bronze-950/80">03</span>
              專業知識與定義
            </div>
            <div className="p-5 rounded-xl bg-paper-100 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark space-y-4">
              <div>
                <h4 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3">
                  正式學術 / 產業定義
                </h4>
                <div className="space-y-4">
                  {sections.professionalKnowledge.definitions
                    .split(/\n+/)
                    .map(item => item.trim())
                    .filter(Boolean)
                    .map((def, idx) => (
                      <p
                        key={idx}
                        className="text-ink-900 dark:text-ink-100 font-serif font-medium leading-relaxed"
                      >
                        {def}
                      </p>
                    ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-2">
                  核心術語 (Terminology)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {sections.professionalKnowledge.terminology.map((term, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded bg-paper-200 dark:bg-ink-800 text-xs font-mono font-medium text-ink-800 dark:text-ink-200"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-academic-borderLight dark:border-academic-borderDark text-xs">
                {/* 理論學說 Card */}
                <div className="p-4 rounded-xl bg-violet-50/90 dark:bg-violet-950/40 border border-violet-300 dark:border-violet-700/60 shadow-xs space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-violet-600 text-white shadow-xs">
                      理論學說
                    </span>
                  </div>
                  <p className="text-violet-950 dark:text-violet-100 font-serif font-semibold leading-relaxed whitespace-pre-line">
                    {sections.professionalKnowledge.theories}
                  </p>
                </div>

                {/* 出處 Card */}
                <div className="p-4 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 shadow-xs space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-emerald-600 text-white shadow-xs">
                      出處
                    </span>
                    <a
                      href="https://law.moj.gov.tw/Index.aspx"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-100/90 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800 text-[11px] font-semibold transition-colors shadow-xs"
                      title="前往法務部全國法規資料庫"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>法務部全國法規資料庫</span>
                    </a>
                  </div>
                  <p className="text-emerald-950 dark:text-emerald-100 font-mono font-semibold leading-relaxed whitespace-pre-line">
                    {sections.professionalKnowledge.citations}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 04: 白話解釋 */}
          <section id="section-04" className="space-y-4 pt-4 border-t border-academic-borderLight dark:border-academic-borderDark">
            <div className="flex items-center gap-2 text-sm font-bold font-serif text-bronze-700 dark:text-bronze-400 uppercase tracking-wide">
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-bronze-100 dark:bg-bronze-950/80">04</span>
              白話重新詮釋 (Plain-Text Explanation)
            </div>
            <div className="p-5 rounded-xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark space-y-3">
              <div>
                <h4 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-1">
                  白話概念重構
                </h4>
                <p className="text-ink-800 dark:text-ink-200 leading-relaxed whitespace-pre-line">
                  {sections.vernacularExplanation.plainText}
                </p>
              </div>
              <div className="pt-3 border-t border-academic-borderLight dark:border-academic-borderDark">
                <h4 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-1">
                  生活化或職場譬喻
                </h4>
                <p className="text-ink-700 dark:text-ink-300 leading-relaxed italic bg-paper-100 dark:bg-ink-800/40 p-3 rounded-lg whitespace-pre-line">
                  「{sections.vernacularExplanation.everydayExamples}」
                </p>
              </div>
            </div>
          </section>

          {/* Section 05: 案例分析 (嚴格區分原書案例與讀者舉例) */}
          <section id="section-05" className="space-y-4 pt-4 border-t border-academic-borderLight dark:border-academic-borderDark">
            <div className="flex items-center gap-2 text-sm font-bold font-serif text-bronze-700 dark:text-bronze-400 uppercase tracking-wide">
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-bronze-100 dark:bg-bronze-950/80">05</span>
              案例分析 (嚴格界定標記)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 原書案例 */}
              <div className="p-4 rounded-xl bg-paper-100 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark space-y-2">
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-academic-navy text-paper-50">
                  原書案例 (原作者論述)
                </span>
                <p className="text-xs text-ink-700 dark:text-ink-300 leading-relaxed whitespace-pre-line">
                  {sections.caseAnalysis.bookCases}
                </p>
              </div>

              {/* 讀者自行舉例 */}
              <div className="p-4 rounded-xl bg-paper-100 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark space-y-2">
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-bronze-600 text-paper-50">
                  自行舉例 (讀者延伸實踐)
                </span>
                <p className="text-xs text-ink-700 dark:text-ink-300 leading-relaxed whitespace-pre-line">
                  {sections.caseAnalysis.customCases}
                </p>
              </div>
            </div>
            <div className="p-3 bg-paper-50 dark:bg-ink-800/30 rounded-lg text-xs text-ink-600 dark:text-academic-mutedDark whitespace-pre-line">
              <span className="font-bold">案例與理論之關聯應用：</span> {sections.caseAnalysis.application}
            </div>
          </section>

          {/* Section 06: 重點整理 */}
          <section id="section-06" className="space-y-4 pt-4 border-t border-academic-borderLight dark:border-academic-borderDark">
            <div className="flex items-center gap-2 text-sm font-bold font-serif text-bronze-700 dark:text-bronze-400 uppercase tracking-wide">
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-bronze-100 dark:bg-bronze-950/80">06</span>
              重點整理與比較圖表
            </div>
            <div className="space-y-4">
              <ul className="space-y-2 text-ink-800 dark:text-ink-200">
                {sections.keyTakeaways.takeaways.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-paper-100 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark">
                    <span className="w-5 h-5 rounded-full bg-bronze-600 text-paper-50 flex items-center justify-center font-mono text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium">{item}</span>
                  </li>
                ))}
              </ul>

              {/* Comparison table Markdown */}
              {sections.keyTakeaways.comparisonTable && (
                <div className="p-4 rounded-xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark overflow-x-auto">
                  <h4 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-2">
                    比較表格
                  </h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {sections.keyTakeaways.comparisonTable}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 07: 個人心得 */}
          <section id="section-07" className="space-y-4 pt-4 border-t border-academic-borderLight dark:border-academic-borderDark">
            <div className="flex items-center gap-2 text-sm font-bold font-serif text-bronze-700 dark:text-bronze-400 uppercase tracking-wide">
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-bronze-100 dark:bg-bronze-950/80">07</span>
              個人心得與批判性思考
            </div>
            <div className="p-5 rounded-xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark space-y-4">
              <div>
                <h4 className="font-serif font-bold text-sm text-ink-900 dark:text-ink-100 mb-1">
                  讀後主觀感想與自我反思
                </h4>
                <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed whitespace-pre-line">
                  {sections.personalInsights.reflections}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-academic-borderLight dark:border-academic-borderDark text-xs">
                <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                    ✓ 認同作者之觀點
                  </span>
                  <p className="text-ink-700 dark:text-ink-300 leading-relaxed whitespace-pre-line">
                    {sections.personalInsights.agreedPoints}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
                  <span className="font-bold text-rose-800 dark:text-rose-300 block mb-1">
                    ✗ 不認同或存疑之處
                  </span>
                  <p className="text-ink-700 dark:text-ink-300 leading-relaxed whitespace-pre-line">
                    {sections.personalInsights.disagreedPoints}
                  </p>
                </div>
              </div>

              {sections.personalInsights.openQuestions && (
                <div className="pt-2 text-xs text-ink-600 dark:text-academic-mutedDark">
                  <span className="font-bold text-ink-800 dark:text-ink-200">❓ 延伸探討疑問：</span>{' '}
                  {sections.personalInsights.openQuestions}
                </div>
              )}
            </div>
          </section>

          {/* Section 08: 本章總結 */}
          <section id="section-08" className="space-y-4 pt-4 border-t border-academic-borderLight dark:border-academic-borderDark">
            <div className="flex items-center gap-2 text-sm font-bold font-serif text-bronze-700 dark:text-bronze-400 uppercase tracking-wide">
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-bronze-100 dark:bg-bronze-950/80">08</span>
              本章總結與收穫
            </div>
            <div className="p-6 rounded-xl bg-paper-100 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark space-y-3">
              <div>
                <h4 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-1">
                  核心知識結語
                </h4>
                <p className="font-serif text-base font-bold text-ink-900 dark:text-ink-100 whitespace-pre-line">
                  {sections.chapterSummary.coreKnowledge}
                </p>
              </div>
              <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed whitespace-pre-line">
                {sections.chapterSummary.conclusions}
              </p>
              {sections.chapterSummary.futureThoughts && (
                <p className="text-xs text-ink-500 dark:text-academic-mutedDark pt-2 border-t border-academic-borderLight dark:border-academic-borderDark italic">
                  下一步行動思考：{sections.chapterSummary.futureThoughts}
                </p>
              )}
            </div>
          </section>

          {/* Navigation Controls between chapters */}
          <div className="no-print pt-8 border-t border-academic-borderLight dark:border-academic-borderDark flex items-center justify-between gap-4">
            {prevChapter ? (
              <Link
                to={`/books/${book.id}/${prevChapter.id}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-academic-borderLight dark:border-academic-borderDark bg-paper-50 dark:bg-academic-cardDark text-xs font-medium text-ink-800 dark:text-ink-200 hover:border-bronze-500 transition-all max-w-[45%]"
              >
                <ChevronLeft className="w-4 h-4 shrink-0 text-bronze-600" />
                <div className="truncate text-left">
                  <span className="text-[10px] text-ink-400 block">上一篇章</span>
                  <span className="truncate block font-serif font-semibold">{prevChapter.title}</span>
                </div>
              </Link>
            ) : <div />}

            {nextChapter ? (
              <Link
                to={`/books/${book.id}/${nextChapter.id}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-academic-borderLight dark:border-academic-borderDark bg-paper-50 dark:bg-academic-cardDark text-xs font-medium text-ink-800 dark:text-ink-200 hover:border-bronze-500 transition-all max-w-[45%]"
              >
                <div className="truncate text-right">
                  <span className="text-[10px] text-ink-400 block">下一篇章</span>
                  <span className="truncate block font-serif font-semibold">{nextChapter.title}</span>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 text-bronze-600" />
              </Link>
            ) : (
              <Link
                to={`/books/${book.id}`}
                className="px-4 py-2.5 rounded-xl bg-academic-navy text-paper-50 text-xs font-medium hover:bg-bronze-700 transition-colors"
              >
                已讀完本書全部篇章
              </Link>
            )}
          </div>
        </main>

        {/* Right Column: Outline & Key Highlights (3 cols) */}
        <aside className="no-print lg:col-span-3 sticky top-32 space-y-6 max-h-[calc(100vh-10rem)] overflow-y-auto pr-2">
          {/* Quick Section Jump Navigator */}
          <div className="bg-paper-50 dark:bg-academic-cardDark p-4 rounded-xl border border-academic-borderLight dark:border-academic-borderDark">
            <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-bronze-700 dark:text-bronze-400 mb-2 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              本章 8 步筆記導航
            </h4>
            <div className="space-y-1 text-xs">
              {[
                { id: 'section-01', label: '01. 章節導讀' },
                { id: 'section-02', label: '02. 核心摘要' },
                { id: 'section-03', label: '03. 專業知識' },
                { id: 'section-04', label: '04. 白話解釋' },
                { id: 'section-05', label: '05. 案例分析' },
                { id: 'section-06', label: '06. 重點整理' },
                { id: 'section-07', label: '07. 個人心得' },
                { id: 'section-08', label: '08. 本章總結' },
              ].map(sec => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="block px-2.5 py-1.5 rounded text-ink-600 dark:text-ink-400 hover:bg-paper-200 dark:hover:bg-ink-800 hover:text-bronze-600 transition-colors truncate"
                >
                  {sec.label}
                </a>
              ))}
            </div>
          </div>

          {/* Chapter Quotes */}
          {chapter.quotes && chapter.quotes.length > 0 && (
            <div className="bg-paper-50 dark:bg-academic-cardDark p-4 rounded-xl border border-academic-borderLight dark:border-academic-borderDark space-y-3">
              <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Quote className="w-3.5 h-3.5" />
                本章金句 ({chapter.quotes.length})
              </h4>
              <div className="space-y-2">
                {chapter.quotes.map(q => (
                  <div key={q.id} className="p-2.5 rounded bg-paper-100 dark:bg-ink-800/50 text-xs space-y-1">
                    <p className="font-serif italic font-medium text-ink-900 dark:text-ink-100">
                      「{q.quote}」
                    </p>
                    <span className="font-mono text-[10px] text-bronze-700 dark:text-bronze-400 block text-right font-bold">
                      {q.page}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Links */}
          {chapter.relatedLinks && chapter.relatedLinks.length > 0 && (
            <div className="bg-paper-50 dark:bg-academic-cardDark p-4 rounded-xl border border-academic-borderLight dark:border-academic-borderDark space-y-2">
              <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-academic-navy dark:text-academic-navyLight flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" />
                跨章節知識關聯
              </h4>
              <div className="space-y-2 text-xs">
                {chapter.relatedLinks.map(rel => (
                  <div key={rel.id} className="p-2 rounded bg-paper-100 dark:bg-ink-800/40">
                    <span className="font-bold text-bronze-700 dark:text-bronze-400 block mb-0.5">
                      🔗 {rel.conceptName}
                    </span>
                    <p className="text-ink-600 dark:text-academic-mutedDark text-[11px] mb-1">
                      {rel.description}
                    </p>
                    {rel.targetChapterId ? (
                      <Link
                        to={`/books/${rel.targetBookId}/${rel.targetChapterId}`}
                        className="text-[11px] text-academic-navy dark:text-academic-navyLight hover:underline font-serif"
                      >
                        → 跳轉至「{rel.targetChapterTitle || '關聯篇章'}」
                      </Link>
                    ) : (
                      <Link
                        to={`/books/${rel.targetBookId}`}
                        className="text-[11px] text-academic-navy dark:text-academic-navyLight hover:underline font-serif"
                      >
                        → 跳轉至《{rel.targetBookTitle}》
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Back to top button */}
          <button
            onClick={scrollToTop}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-academic-borderLight dark:border-academic-borderDark text-xs text-ink-500 hover:text-ink-900 hover:bg-paper-200 transition-colors"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            回到頂部
          </button>
        </aside>
      </div>
    </div>
  );
};

