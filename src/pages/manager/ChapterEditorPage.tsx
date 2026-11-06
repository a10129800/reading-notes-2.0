import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChapterDetail, QuoteItem, RelatedLink } from '../../types';
import { localApiService } from '../../services/localApiService';
import { createDefaultChapterSections } from '../../utils/template';
import {
  ArrowLeft,
  Save,
  Quote,
  Layers,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Plus,
  Trash2,
  FileText,
  Brain,
  HelpCircle,
  Clock
} from 'lucide-react';

export const ChapterEditorPage: React.FC = () => {
  const { bookId, chapterId } = useParams<{ bookId: string; chapterId: string }>();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(1);

  // New quote state
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [quoteText, setQuoteText] = useState('');
  const [quotePage, setQuotePage] = useState('');
  const [quoteNote, setQuoteNote] = useState('');

  useEffect(() => {
    if (!bookId || !chapterId) return;
    localApiService.getChapter(bookId, chapterId).then(data => {
      setChapter(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [bookId, chapterId]);

  if (loading) return <div className="p-20 text-center text-ink-400">載入中...</div>;
  if (!chapter || !bookId) return <div className="p-20 text-center text-ink-400">找不到此章節</div>;

  const sections = chapter.sections;

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await localApiService.saveChapter(bookId, chapter);
      setChapter(saved);
      alert('章節 8 步筆記已成功儲存！');
    } catch (err: any) {
      alert(`儲存失敗：${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuote = () => {
    if (!quoteText.trim()) return;
    const newQ: QuoteItem = {
      id: `q-${Date.now()}`,
      quote: quoteText.trim(),
      sourceChapterId: chapter.id,
      sourceChapterTitle: chapter.title,
      page: quotePage.trim() || undefined,
      note: quoteNote.trim() || undefined,
    };
    setChapter({
      ...chapter,
      quotes: [...(chapter.quotes || []), newQ],
    });
    setQuoteText('');
    setQuotePage('');
    setQuoteNote('');
    setShowAddQuote(false);
  };

  const handleDeleteQuote = (id: string) => {
    setChapter({
      ...chapter,
      quotes: (chapter.quotes || []).filter(q => q.id !== id),
    });
  };

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-academic-borderLight dark:border-academic-borderDark">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/manager/books/${bookId}`)}
            className="p-2 rounded-lg border border-academic-borderLight dark:border-academic-borderDark hover:bg-paper-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-serif text-2xl font-extrabold text-ink-900 dark:text-ink-100">
              編輯 8 步筆記：《{chapter.title}》
            </h1>
            <p className="text-xs text-ink-400 font-mono">
              書籍: {bookId} · 章節 ID: {chapter.id}
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-lg bg-bronze-600 text-paper-50 hover:bg-bronze-700 transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" />
          {saving ? '儲存中...' : '儲存章節筆記'}
        </button>
      </div>

      {/* Meta Bar */}
      <div className="p-4 rounded-xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">篇章標題</label>
          <input
            type="text"
            value={chapter.title}
            onChange={e => setChapter({ ...chapter, title: e.target.value })}
            className="w-full p-2 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800"
          />
        </div>
        <div>
          <label className="font-bold text-ink-700 dark:text-ink-300 block mb-1">副標題</label>
          <input
            type="text"
            value={chapter.subtitle || ''}
            onChange={e => setChapter({ ...chapter, subtitle: e.target.value })}
            className="w-full p-2 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800"
          />
        </div>
        <div className="flex gap-4 items-center pt-4">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={chapter.completed || false}
              onChange={e => setChapter({ ...chapter, completed: e.target.checked })}
              className="w-4 h-4 text-bronze-600 rounded"
            />
            <span className="font-bold text-ink-800 dark:text-ink-200">標記為已精讀完畢</span>
          </label>
        </div>
      </div>

      {/* 8-Section Navigation Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-academic-borderLight dark:border-academic-borderDark pb-2 text-xs font-semibold">
        {[
          { num: 1, label: '01. 導讀' },
          { num: 2, label: '02. 摘要' },
          { num: 3, label: '03. 專業知識' },
          { num: 4, label: '04. 白話解釋' },
          { num: 5, label: '05. 案例分析' },
          { num: 6, label: '06. 重點整理' },
          { num: 7, label: '07. 個人心得' },
          { num: 8, label: '08. 本章總結' },
          { num: 9, label: '★ 金句管理' },
        ].map(tab => (
          <button
            key={tab.num}
            onClick={() => setActiveTab(tab.num)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === tab.num
                ? 'bg-bronze-600 text-paper-50 shadow-xs'
                : 'text-ink-600 dark:text-ink-400 hover:bg-paper-200 dark:hover:bg-ink-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Editor Content Area */}
      <div className="p-6 rounded-2xl bg-paper-50 dark:bg-academic-cardDark border border-academic-borderLight dark:border-academic-borderDark space-y-6 text-xs">
        {/* Tab 1: 01. 章節導讀 */}
        {activeTab === 1 && (
          <div className="space-y-4">
            <h3 className="font-serif text-base font-bold text-ink-900 dark:text-ink-100">
              01. 章節導讀 (Introduction)
            </h3>
            <div>
              <label className="font-bold block mb-1">本章背景介紹 (Overview)</label>
              <textarea
                rows={4}
                value={sections.introduction.overview}
                onChange={e => setChapter({
                  ...chapter,
                  sections: { ...sections, introduction: { ...sections.introduction, overview: e.target.value } }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">學習目標 (每行一條)</label>
              <textarea
                rows={3}
                value={sections.introduction.learningGoals.join('\n')}
                onChange={e => setChapter({
                  ...chapter,
                  sections: {
                    ...sections,
                    introduction: {
                      ...sections.introduction,
                      learningGoals: e.target.value.split('\n').filter(Boolean)
                    }
                  }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 font-mono"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">核心問題 (每行一條)</label>
              <textarea
                rows={3}
                value={sections.introduction.coreQuestions.join('\n')}
                onChange={e => setChapter({
                  ...chapter,
                  sections: {
                    ...sections,
                    introduction: {
                      ...sections.introduction,
                      coreQuestions: e.target.value.split('\n').filter(Boolean)
                    }
                  }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 font-mono"
              />
            </div>
          </div>
        )}

        {/* Tab 2: 02. 核心摘要 */}
        {activeTab === 2 && (
          <div className="space-y-4">
            <h3 className="font-serif text-base font-bold text-ink-900 dark:text-ink-100">
              02. 核心摘要 (Core Summary)
            </h3>
            <div>
              <label className="font-bold block mb-1">作者主要論述 (Main Argument)</label>
              <textarea
                rows={3}
                value={sections.summary.mainArgument}
                onChange={e => setChapter({
                  ...chapter,
                  sections: { ...sections, summary: { ...sections.summary, mainArgument: e.target.value } }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">章節內容整理 (Content Digest)</label>
              <textarea
                rows={5}
                value={sections.summary.contentDigest}
                onChange={e => setChapter({
                  ...chapter,
                  sections: { ...sections, summary: { ...sections.summary, contentDigest: e.target.value } }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">重要觀點條列 (每行一項)</label>
              <textarea
                rows={4}
                value={sections.summary.keyPoints.join('\n')}
                onChange={e => setChapter({
                  ...chapter,
                  sections: {
                    ...sections,
                    summary: {
                      ...sections.summary,
                      keyPoints: e.target.value.split('\n').filter(Boolean)
                    }
                  }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 font-mono"
              />
            </div>
          </div>
        )}

        {/* Tab 3: 03. 專業知識 */}
        {activeTab === 3 && (
          <div className="space-y-4">
            <h3 className="font-serif text-base font-bold text-ink-900 dark:text-ink-100">
              03. 專業知識與定義 (Professional Knowledge)
            </h3>
            <div>
              <label className="font-bold block mb-1">正式學術 / 產業定義 (Definitions)</label>
              <textarea
                rows={3}
                value={sections.professionalKnowledge.definitions}
                onChange={e => setChapter({
                  ...chapter,
                  sections: { ...sections, professionalKnowledge: { ...sections.professionalKnowledge, definitions: e.target.value } }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">專業術語 (每行一項)</label>
              <textarea
                rows={3}
                value={sections.professionalKnowledge.terminology.join('\n')}
                onChange={e => setChapter({
                  ...chapter,
                  sections: {
                    ...sections,
                    professionalKnowledge: {
                      ...sections.professionalKnowledge,
                      terminology: e.target.value.split('\n').filter(Boolean)
                    }
                  }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 font-mono"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">理論與學說背景 (Theories)</label>
              <textarea
                rows={3}
                value={sections.professionalKnowledge.theories}
                onChange={e => setChapter({
                  ...chapter,
                  sections: { ...sections, professionalKnowledge: { ...sections.professionalKnowledge, theories: e.target.value } }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">文獻與出處依據 (Citations)</label>
              <textarea
                rows={2}
                value={sections.professionalKnowledge.citations}
                onChange={e => setChapter({
                  ...chapter,
                  sections: { ...sections, professionalKnowledge: { ...sections.professionalKnowledge, citations: e.target.value } }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 font-mono"
              />
            </div>
          </div>
        )}

        {/* Tab 4: 04. 白話解釋 */}
        {activeTab === 4 && (
          <div className="space-y-4">
            <h3 className="font-serif text-base font-bold text-ink-900 dark:text-ink-100">
              04. 白話解釋 (Vernacular Explanation)
            </h3>
            <div>
              <label className="font-bold block mb-1">白話概念重構 (Plain-Text)</label>
              <textarea
                rows={4}
                value={sections.vernacularExplanation.plainText}
                onChange={e => setChapter({
                  ...chapter,
                  sections: { ...sections, vernacularExplanation: { ...sections.vernacularExplanation, plainText: e.target.value } }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">生活化或職場譬喻 (Everyday Examples)</label>
              <textarea
                rows={4}
                value={sections.vernacularExplanation.everydayExamples}
                onChange={e => setChapter({
                  ...chapter,
                  sections: { ...sections, vernacularExplanation: { ...sections.vernacularExplanation, everydayExamples: e.target.value } }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
              />
            </div>
          </div>
        )}

        {/* Tab 5: 05. 案例分析 */}
        {activeTab === 5 && (
          <div className="space-y-4">
            <h3 className="font-serif text-base font-bold text-ink-900 dark:text-ink-100">
              05. 案例分析 (Case Analysis - 嚴格區分原書與自擬)
            </h3>
            <div>
              <label className="font-bold block mb-1 text-academic-navy dark:text-academic-navyLight">
                【原書案例】原作者在書中引用的經典實例 (Book Cases)
              </label>
              <textarea
                rows={4}
                value={sections.caseAnalysis.bookCases}
                onChange={e => setChapter({
                  ...chapter,
                  sections: { ...sections, caseAnalysis: { ...sections.caseAnalysis, bookCases: e.target.value } }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
              />
            </div>
            <div>
              <label className="font-bold block mb-1 text-bronze-700 dark:text-bronze-400">
                【讀者自行舉例】個人職場或日常生活的延伸案例 (Custom Cases)
              </label>
              <textarea
                rows={4}
                value={sections.caseAnalysis.customCases}
                onChange={e => setChapter({
                  ...chapter,
                  sections: { ...sections, caseAnalysis: { ...sections.caseAnalysis, customCases: e.target.value } }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">案例與理論之關聯應用 (Application)</label>
              <textarea
                rows={3}
                value={sections.caseAnalysis.application}
                onChange={e => setChapter({
                  ...chapter,
                  sections: { ...sections, caseAnalysis: { ...sections.caseAnalysis, application: e.target.value } }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
              />
            </div>
          </div>
        )}

        {/* Tab 6: 06. 重點整理 */}
        {activeTab === 6 && (
          <div className="space-y-4">
            <h3 className="font-serif text-base font-bold text-ink-900 dark:text-ink-100">
              06. 重點整理與圖表 (Key Takeaways & Diagrams)
            </h3>
            <div>
              <label className="font-bold block mb-1">條列重點 (每行一條)</label>
              <textarea
                rows={4}
                value={sections.keyTakeaways.takeaways.join('\n')}
                onChange={e => setChapter({
                  ...chapter,
                  sections: {
                    ...sections,
                    keyTakeaways: {
                      ...sections.keyTakeaways,
                      takeaways: e.target.value.split('\n').filter(Boolean)
                    }
                  }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 font-mono"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">比較表格 (Markdown 格式)</label>
              <textarea
                rows={6}
                value={sections.keyTakeaways.comparisonTable || ''}
                onChange={e => setChapter({
                  ...chapter,
                  sections: {
                    ...sections,
                    keyTakeaways: {
                      ...sections.keyTakeaways,
                      comparisonTable: e.target.value
                    }
                  }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 font-mono"
              />
            </div>
          </div>
        )}

        {/* Tab 7: 07. 個人心得 */}
        {activeTab === 7 && (
          <div className="space-y-4">
            <h3 className="font-serif text-base font-bold text-ink-900 dark:text-ink-100">
              07. 個人心得與批判性思維 (Personal Insights)
            </h3>
            <div>
              <label className="font-bold block mb-1">閱讀感想與個人理解 (Reflections)</label>
              <textarea
                rows={4}
                value={sections.personalInsights.reflections}
                onChange={e => setChapter({
                  ...chapter,
                  sections: { ...sections, personalInsights: { ...sections.personalInsights, reflections: e.target.value } }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold block mb-1 text-emerald-700 dark:text-emerald-400">
                  認同的觀點 (Agreed Points)
                </label>
                <textarea
                  rows={3}
                  value={sections.personalInsights.agreedPoints}
                  onChange={e => setChapter({
                    ...chapter,
                    sections: { ...sections, personalInsights: { ...sections.personalInsights, agreedPoints: e.target.value } }
                  })}
                  className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
                />
              </div>
              <div>
                <label className="font-bold block mb-1 text-rose-700 dark:text-rose-400">
                  不認同或存疑的觀點 (Disagreed Points)
                </label>
                <textarea
                  rows={3}
                  value={sections.personalInsights.disagreedPoints}
                  onChange={e => setChapter({
                    ...chapter,
                    sections: { ...sections, personalInsights: { ...sections.personalInsights, disagreedPoints: e.target.value } }
                  })}
                  className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
                />
              </div>
            </div>
            <div>
              <label className="font-bold block mb-1">延伸疑問與批判 (Open Questions)</label>
              <textarea
                rows={2}
                value={sections.personalInsights.openQuestions}
                onChange={e => setChapter({
                  ...chapter,
                  sections: { ...sections, personalInsights: { ...sections.personalInsights, openQuestions: e.target.value } }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
              />
            </div>
          </div>
        )}

        {/* Tab 8: 08. 本章總結 */}
        {activeTab === 8 && (
          <div className="space-y-4">
            <h3 className="font-serif text-base font-bold text-ink-900 dark:text-ink-100">
              08. 本章總結 (Chapter Summary)
            </h3>
            <div>
              <label className="font-bold block mb-1">核心知識 (Core Knowledge)</label>
              <textarea
                rows={3}
                value={sections.chapterSummary.coreKnowledge}
                onChange={e => setChapter({
                  ...chapter,
                  sections: { ...sections, chapterSummary: { ...sections.chapterSummary, coreKnowledge: e.target.value } }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">重要結論 (Conclusions)</label>
              <textarea
                rows={3}
                value={sections.chapterSummary.conclusions}
                onChange={e => setChapter({
                  ...chapter,
                  sections: { ...sections, chapterSummary: { ...sections.chapterSummary, conclusions: e.target.value } }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">延伸思考與下一步行動 (Future Thoughts)</label>
              <textarea
                rows={3}
                value={sections.chapterSummary.futureThoughts}
                onChange={e => setChapter({
                  ...chapter,
                  sections: { ...sections, chapterSummary: { ...sections.chapterSummary, futureThoughts: e.target.value } }
                })}
                className="w-full p-2.5 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100"
              />
            </div>
          </div>
        )}

        {/* Tab 9: 金句管理 */}
        {activeTab === 9 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base font-bold text-ink-900 dark:text-ink-100 flex items-center gap-2">
                  <Quote className="w-5 h-5 text-bronze-600" />
                  本章金句收藏管理
                </h3>
                <p className="text-xs text-ink-500">
                  原書重要引述必須記錄頁碼，作者觀點與個人心得分開。
                </p>
              </div>

              <button
                onClick={() => setShowAddQuote(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bronze-600 text-paper-50 font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                新增金句
              </button>
            </div>

            {/* Quote list */}
            {(!chapter.quotes || chapter.quotes.length === 0) ? (
              <div className="p-12 text-center rounded-xl border border-dashed border-academic-borderLight dark:border-academic-borderDark text-ink-400">
                本章尚未收錄金句。點擊「新增金句」進行摘錄。
              </div>
            ) : (
              <div className="space-y-3">
                {chapter.quotes.map(q => (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl bg-paper-100 dark:bg-ink-800/40 border border-academic-borderLight dark:border-academic-borderDark flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <p className="font-serif text-sm font-semibold italic text-ink-900 dark:text-ink-100">
                        「{q.quote}」
                      </p>
                      {q.page && (
                        <span className="font-mono text-bronze-700 dark:text-bronze-400 font-bold text-xs">
                          {q.page}
                        </span>
                      )}
                      {q.note && (
                        <p className="text-xs text-ink-500">💡 {q.note}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteQuote(q.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add quote form */}
            {showAddQuote && (
              <div className="p-4 rounded-xl border border-bronze-300 dark:border-bronze-800 bg-bronze-50/50 dark:bg-bronze-950/20 space-y-3">
                <h4 className="font-bold text-ink-900 dark:text-ink-100">新增原書引述金句</h4>
                <div>
                  <label className="font-bold block mb-1">引述語句 *</label>
                  <textarea
                    rows={2}
                    value={quoteText}
                    onChange={e => setQuoteText(e.target.value)}
                    placeholder="原書經典字句..."
                    className="w-full p-2 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-50 dark:bg-ink-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">頁碼 (例如：p.42)</label>
                    <input
                      type="text"
                      value={quotePage}
                      onChange={e => setQuotePage(e.target.value)}
                      placeholder="p.42"
                      className="w-full p-2 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-50 dark:bg-ink-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">理解註釋 (可選)</label>
                    <input
                      type="text"
                      value={quoteNote}
                      onChange={e => setQuoteNote(e.target.value)}
                      placeholder="關鍵啟發..."
                      className="w-full p-2 rounded-lg border border-academic-borderLight dark:border-academic-borderDark bg-paper-50 dark:bg-ink-800"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddQuote(false)}
                    className="px-3 py-1.5 rounded-lg border border-academic-borderLight text-ink-600"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleAddQuote}
                    className="px-4 py-1.5 rounded-lg bg-bronze-600 text-paper-50 font-bold"
                  >
                    儲存金句
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

