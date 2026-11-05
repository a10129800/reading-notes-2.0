import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Book, QuoteItem, RelatedLink } from '../types';
import { publicDataService } from '../services/publicDataService';
import { Quote, Layers, Search, Sparkles, Filter, ExternalLink, BookOpen, Bookmark } from 'lucide-react';

export const KnowledgeGraphPage: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'quotes' | 'relations'>('quotes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');

  useEffect(() => {
    let mounted = true;
    Promise.all([
      publicDataService.getPublicBooks(),
      publicDataService.getAllPublicQuotes(),
    ]).then(([bList, qList]) => {
      if (mounted) {
        setBooks(bList);
        setQuotes(qList);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  // Collect all tags across quotes
  const allTags = Array.from(
    new Set(quotes.flatMap(q => q.tags || []))
  );

  const filteredQuotes = quotes.filter(q => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchQuote = q.quote.toLowerCase().includes(query);
      const matchNote = q.note?.toLowerCase().includes(query);
      const matchSource = q.sourceChapterTitle?.toLowerCase().includes(query);
      if (!matchQuote && !matchNote && !matchSource) return false;
    }
    if (selectedTag !== 'ALL' && (!q.tags || !q.tags.includes(selectedTag))) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-extrabold text-ink-900 dark:text-ink-100 flex items-center gap-2.5">
          <Layers className="w-8 h-8 text-bronze-600" />
          知識關聯與思想金句
        </h1>
        <p className="text-sm text-ink-600 dark:text-academic-mutedDark mt-1">
          穿透單一書籍的篇章限制，縱覽跨書籍概念關聯網絡與精選引述金句庫。
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-academic-borderLight dark:border-academic-borderDark gap-4 text-sm font-medium">
        <button
          onClick={() => setActiveTab('quotes')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'quotes'
              ? 'border-bronze-600 text-bronze-700 dark:text-bronze-400 font-semibold'
              : 'border-transparent text-ink-500 hover:text-ink-900'
          }`}
        >
          <Quote className="w-4 h-4" />
          精選金句萃取 ({quotes.length})
        </button>
        <button
          onClick={() => setActiveTab('relations')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'relations'
              ? 'border-bronze-600 text-bronze-700 dark:text-bronze-400 font-semibold'
              : 'border-transparent text-ink-500 hover:text-ink-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          跨篇章概念地圖
        </button>
      </div>

      {/* Tab: Quotes Collection */}
      {activeTab === 'quotes' && (
        <div className="space-y-6">
          {/* Search & Tag Filter */}
          <div className="bg-paper-50 dark:bg-academic-cardDark p-4 rounded-xl border border-academic-borderLight dark:border-academic-borderDark space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜尋金句字句、筆記註釋或篇章出處..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-bronze-500"
              />
            </div>

            {allTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-academic-borderLight dark:border-academic-borderDark">
                <span className="text-xs text-ink-500 flex items-center gap-1 mr-1">
                  <Filter className="w-3.5 h-3.5" /> 標籤：
                </span>
                <button
                  onClick={() => setSelectedTag('ALL')}
                  className={`px-2.5 py-0.5 text-xs rounded font-medium ${
                    selectedTag === 'ALL'
                      ? 'bg-bronze-600 text-paper-50'
                      : 'bg-paper-200 dark:bg-ink-800 text-ink-600 hover:bg-paper-300'
                  }`}
                >
                  全部
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-2.5 py-0.5 text-xs rounded font-medium ${
                      selectedTag === tag
                        ? 'bg-bronze-600 text-paper-50'
                        : 'bg-paper-200 dark:bg-ink-800 text-ink-600 hover:bg-paper-300'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quotes Grid */}
          {loading ? (
            <div className="p-16 text-center text-ink-400">載入金句中...</div>
          ) : filteredQuotes.length === 0 ? (
            <div className="p-16 text-center rounded-xl border border-dashed border-academic-borderLight dark:border-academic-borderDark text-ink-500">
              無符合的金句。
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredQuotes.map(q => (
                <div
                  key={q.id}
                  className="p-6 rounded-xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <Quote className="w-7 h-7 text-bronze-400/40 mb-3" />
                    <blockquote className="font-serif text-base font-bold text-ink-900 dark:text-ink-100 leading-relaxed italic mb-3">
                      「{q.quote}」
                    </blockquote>
                    {q.note && (
                      <p className="text-xs text-ink-600 dark:text-academic-mutedDark leading-relaxed bg-paper-100 dark:bg-ink-800/40 p-3 rounded-lg border-l-2 border-bronze-400 mb-4">
                        💡 {q.note}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-academic-borderLight dark:border-academic-borderDark flex items-center justify-between text-xs text-ink-500">
                    <div className="flex items-center gap-2">
                      <Bookmark className="w-3.5 h-3.5 text-bronze-600" />
                      <span>{q.sourceChapterTitle || '原書經典'}</span>
                    </div>
                    {q.page && (
                      <span className="font-mono text-bronze-700 dark:text-bronze-400 font-bold">
                        {q.page}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Relations */}
      {activeTab === 'relations' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark space-y-4">
            <h3 className="font-serif text-lg font-bold text-ink-900 dark:text-ink-100">
              跨篇章核心概念對應網絡
            </h3>
            <p className="text-xs text-ink-600 dark:text-academic-mutedDark leading-relaxed">
              透過標籤與知識關聯點，追蹤不同篇章與書籍在同一核心觀點上的承接、對話與印證。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-lg bg-paper-100 dark:bg-ink-800/50 border border-academic-borderLight dark:border-academic-borderDark">
                <span className="text-xs font-bold text-bronze-700 dark:text-bronze-400 block mb-1">
                  🔗 時間非再生性 (Time as Non-renewable Resource)
                </span>
                <p className="text-xs text-ink-600 dark:text-academic-mutedDark mb-3">
                  連結《卓有成效的管理者》第一章現實四重困境與第二章時間審計三部曲。
                </p>
                <Link
                  to="/books/the-effective-executive/chapter-02"
                  className="text-xs font-semibold text-academic-navy dark:text-academic-navyLight hover:underline"
                >
                  檢視第二章時間管理分析 →
                </Link>
              </div>

              <div className="p-4 rounded-lg bg-paper-100 dark:bg-ink-800/50 border border-academic-borderLight dark:border-academic-borderDark">
                <span className="text-xs font-bold text-bronze-700 dark:text-bronze-400 block mb-1">
                  🔗 外部貢獻導向 (External Contribution Focus)
                </span>
                <p className="text-xs text-ink-600 dark:text-academic-mutedDark mb-3">
                  「組織內部只有成本，成果只存在於組織外部」之哲學基石。
                </p>
                <Link
                  to="/books/the-effective-executive/chapter-01"
                  className="text-xs font-semibold text-academic-navy dark:text-academic-navyLight hover:underline"
                >
                  檢視第一章外部成果論述 →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
