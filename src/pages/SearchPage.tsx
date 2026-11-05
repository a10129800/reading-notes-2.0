import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Book, ChapterDetail, SearchResultItem } from '../types';
import { publicDataService } from '../services/publicDataService';
import { Search, BookOpen, Layers, ArrowRight, Sparkles, Filter } from 'lucide-react';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    publicDataService.getPublicBooks().then(setBooks);
  }, []);

  const performSearch = async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    const q = term.toLowerCase();
    const hits: SearchResultItem[] = [];

    // Search books
    for (const book of books) {
      if (book.status !== 'public') continue; // Strict whitelist

      // Match Book Title
      if (book.title.toLowerCase().includes(q)) {
        hits.push({
          bookId: book.id,
          bookTitle: book.title,
          sectionLabel: '書名相符',
          snippet: book.title,
          matchScore: 100,
          status: 'public',
        });
      }

      // Match Book Author
      if (book.author.toLowerCase().includes(q)) {
        hits.push({
          bookId: book.id,
          bookTitle: book.title,
          sectionLabel: '作者相符',
          snippet: `作者：${book.author}`,
          matchScore: 90,
          status: 'public',
        });
      }

      // Match Core Idea
      if (book.coreIdea.toLowerCase().includes(q)) {
        hits.push({
          bookId: book.id,
          bookTitle: book.title,
          sectionKey: 'coreIdea',
          sectionLabel: '全書核心思想',
          snippet: book.coreIdea,
          matchScore: 85,
          status: 'public',
        });
      }

      // Match Tags
      if (book.tags?.some(t => t.toLowerCase().includes(q))) {
        hits.push({
          bookId: book.id,
          bookTitle: book.title,
          sectionLabel: '書籍標籤',
          snippet: `標籤：${book.tags.join(', ')}`,
          matchScore: 80,
          status: 'public',
        });
      }

      // Match Chapters
      if (book.chapters && Array.isArray(book.chapters)) {
        for (const chMeta of book.chapters) {
          // Chapter Title
          if (chMeta.title.toLowerCase().includes(q)) {
            hits.push({
              bookId: book.id,
              bookTitle: book.title,
              chapterId: chMeta.id,
              chapterTitle: chMeta.title,
              sectionLabel: '篇章標題',
              snippet: chMeta.title,
              matchScore: 95,
              status: 'public',
            });
          }

          // Fetch full chapter to inspect 8 sections
          const chapterDetail = await publicDataService.getChapter(book.id, chMeta.id);
          if (chapterDetail && chapterDetail.sections) {
            const sec = chapterDetail.sections;

            // 01. Introduction
            if (sec.introduction.overview.toLowerCase().includes(q)) {
              hits.push({
                bookId: book.id,
                bookTitle: book.title,
                chapterId: chMeta.id,
                chapterTitle: chMeta.title,
                sectionKey: 'introduction',
                sectionLabel: '01. 章節導讀',
                snippet: sec.introduction.overview,
                matchScore: 70,
                status: 'public',
              });
            }

            // 02. Summary
            if (sec.summary.mainArgument.toLowerCase().includes(q) || sec.summary.contentDigest.toLowerCase().includes(q)) {
              hits.push({
                bookId: book.id,
                bookTitle: book.title,
                chapterId: chMeta.id,
                chapterTitle: chMeta.title,
                sectionKey: 'summary',
                sectionLabel: '02. 核心摘要',
                snippet: sec.summary.mainArgument || sec.summary.contentDigest,
                matchScore: 75,
                status: 'public',
              });
            }

            // 03. Professional Knowledge
            if (sec.professionalKnowledge.definitions.toLowerCase().includes(q) ||
                sec.professionalKnowledge.theories.toLowerCase().includes(q) ||
                sec.professionalKnowledge.terminology.some(t => t.toLowerCase().includes(q))) {
              hits.push({
                bookId: book.id,
                bookTitle: book.title,
                chapterId: chMeta.id,
                chapterTitle: chMeta.title,
                sectionKey: 'professionalKnowledge',
                sectionLabel: '03. 專業知識與定義',
                snippet: sec.professionalKnowledge.definitions || sec.professionalKnowledge.theories,
                matchScore: 80,
                status: 'public',
              });
            }

            // 04. Vernacular Explanation
            if (sec.vernacularExplanation.plainText.toLowerCase().includes(q) ||
                sec.vernacularExplanation.everydayExamples.toLowerCase().includes(q)) {
              hits.push({
                bookId: book.id,
                bookTitle: book.title,
                chapterId: chMeta.id,
                chapterTitle: chMeta.title,
                sectionKey: 'vernacularExplanation',
                sectionLabel: '04. 白話解釋',
                snippet: sec.vernacularExplanation.plainText,
                matchScore: 75,
                status: 'public',
              });
            }

            // 05. Case Analysis
            if (sec.caseAnalysis.bookCases.toLowerCase().includes(q) || sec.caseAnalysis.customCases.toLowerCase().includes(q)) {
              hits.push({
                bookId: book.id,
                bookTitle: book.title,
                chapterId: chMeta.id,
                chapterTitle: chMeta.title,
                sectionKey: 'caseAnalysis',
                sectionLabel: '05. 案例分析',
                snippet: sec.caseAnalysis.bookCases || sec.caseAnalysis.customCases,
                matchScore: 70,
                status: 'public',
              });
            }

            // 07. Personal Insights
            if (sec.personalInsights.reflections.toLowerCase().includes(q) ||
                sec.personalInsights.agreedPoints.toLowerCase().includes(q)) {
              hits.push({
                bookId: book.id,
                bookTitle: book.title,
                chapterId: chMeta.id,
                chapterTitle: chMeta.title,
                sectionKey: 'personalInsights',
                sectionLabel: '07. 個人心得',
                snippet: sec.personalInsights.reflections,
                matchScore: 70,
                status: 'public',
              });
            }
          }
        }
      }
    }

    hits.sort((a, b) => b.matchScore - a.matchScore);
    setResults(hits);
    setIsSearching(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(query.trim() ? { q: query.trim() } : {});
    performSearch(query);
  };

  useEffect(() => {
    if (initialQuery && books.length > 0) {
      performSearch(initialQuery);
    }
  }, [books, initialQuery]);

  // Helper to highlight matching text
  const renderSnippet = (text: string, term: string) => {
    if (!term.trim()) return text;
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase() ? (
        <mark key={i} className="bg-amber-200 dark:bg-amber-900/60 dark:text-amber-100 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Search Header */}
      <div className="text-center space-y-2">
        <h1 className="font-serif text-3xl font-extrabold text-ink-900 dark:text-ink-100 flex items-center justify-center gap-2">
          <Search className="w-8 h-8 text-bronze-600" />
          全書庫全文檢索
        </h1>
        <p className="text-sm text-ink-600 dark:text-academic-mutedDark">
          檢索範圍涵蓋：書名、作者、章節標題、專業定義、白話拆解、案例分析、個人心得與標籤。
        </p>
      </div>

      {/* Search Input Form */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="輸入關鍵詞或學術概念，例如：時間管理、知識工作者、杜拉克..."
          className="w-full pl-12 pr-28 py-3.5 text-base rounded-xl border border-academic-borderLight dark:border-academic-borderDark bg-paper-50 dark:bg-academic-cardDark text-ink-900 dark:text-ink-100 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-bronze-500 shadow-sm"
        />
        <Search className="w-5 h-5 text-ink-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 rounded-lg bg-academic-navy text-paper-50 hover:bg-bronze-700 transition-colors text-sm font-medium"
        >
          搜尋
        </button>
      </form>

      {/* Results */}
      {isSearching ? (
        <div className="p-16 text-center text-ink-400">正在全面檢索公開資料庫...</div>
      ) : hasSearched && results.length === 0 ? (
        <div className="p-16 text-center rounded-xl border border-dashed border-academic-borderLight dark:border-academic-borderDark text-ink-500">
          找不到符合「<span className="font-bold text-ink-800 dark:text-ink-200">{query}</span>」的公開書籍或章節內容。
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <div className="text-xs text-ink-500 dark:text-academic-mutedDark">
            共找到 {results.length} 處相符筆記段落
          </div>

          <div className="space-y-3">
            {results.map((item, idx) => {
              const targetUrl = item.chapterId
                ? `/books/${item.bookId}/${item.chapterId}`
                : `/books/${item.bookId}`;

              return (
                <Link
                  key={idx}
                  to={targetUrl}
                  className="group block p-5 rounded-xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark hover:border-bronze-500 transition-all shadow-xs"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-serif font-bold text-academic-navy dark:text-academic-navyLight">
                      《{item.bookTitle}》
                    </span>
                    <span className="px-2 py-0.5 rounded bg-bronze-50 dark:bg-bronze-950/60 text-bronze-700 dark:text-bronze-300 font-mono text-[11px]">
                      {item.sectionLabel}
                    </span>
                  </div>

                  {item.chapterTitle && (
                    <h3 className="font-serif text-base font-bold text-ink-900 dark:text-ink-100 group-hover:text-bronze-600 transition-colors mb-2">
                      {item.chapterTitle}
                    </h3>
                  )}

                  <p className="text-xs text-ink-600 dark:text-academic-mutedDark leading-relaxed line-clamp-2">
                    {renderSnippet(item.snippet, query)}
                  </p>

                  <div className="mt-3 pt-2 border-t border-academic-borderLight dark:border-academic-borderDark flex items-center justify-end text-[11px] text-bronze-700 dark:text-bronze-400 font-medium">
                    閱讀完整篇章筆記 <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};
