import { CitationItem } from '../types';
import rawLawList from '../data/lawDatabase.json';

export interface LawDatabaseItem extends CitationItem {
  lawNo?: string;
  shortName?: string;
  part?: string;
  chapter?: string;
  isDeleted?: boolean;
  category?: 'general' | 'specific' | 'external';
  lawCategoryName?: string;
  isChapterCitation?: boolean;
}

export type LawTabFilter = 'all' | 'chapter' | 'general' | 'specific' | 'external';

class LawDatabaseService {
  private laws: LawDatabaseItem[];

  constructor() {
    this.laws = rawLawList as LawDatabaseItem[];
  }

  /**
   * 取得法規資料庫中所有條文 (包含刑法全 422 條與重要資料外法條)
   */
  getAllLaws(): LawDatabaseItem[] {
    return this.laws;
  }

  /**
   * 合併當前章節的特殊筆記與頁碼標註
   */
  mergeWithChapterCitations(chapterCitations: CitationItem[] = []): LawDatabaseItem[] {
    if (!chapterCitations || chapterCitations.length === 0) {
      return this.laws;
    }

    const chapMap = new Map<string, CitationItem>();
    chapterCitations.forEach((cit) => {
      if (cit.lawName.includes('優生保健法') || cit.id.includes('genetic') || cit.id.includes('ext')) {
        chapMap.set(cit.id, cit);
        return;
      }
      const numMatch = cit.lawName.match(/刑法第\s*(\d+)\s*條/) || cit.lawName.match(/^第\s*(\d+)\s*條/);
      if (numMatch) {
        chapMap.set(numMatch[1], cit);
      }
      chapMap.set(cit.id, cit);
    });

    return this.laws.map((item) => {
      // 外部條文匹配 id，刑法條文匹配條號或 id
      const match =
        item.category === 'external'
          ? chapMap.get(item.id) || (item.lawNo && item.lawName.includes('優生保健') ? chapMap.get('law-1-9') : undefined)
          : (item.lawNo && chapMap.get(item.lawNo)) || chapMap.get(item.id);

      if (match) {
        return {
          ...item,
          articleTitle: match.articleTitle || item.articleTitle,
          bookNote: match.bookNote || item.bookNote,
          page: match.page || item.page,
          summary: match.summary || item.summary,
          isChapterCitation: true,
        };
      }
      return item;
    });
  }

  /**
   * 依條號或條文 ID 查找條文
   */
  findLaw(query: string, chapterCitations: CitationItem[] = []): LawDatabaseItem | undefined {
    if (!query) return undefined;
    const clean = query.trim();
    const numMatch = clean.match(/\d+/);
    const targetNum = numMatch ? numMatch[0] : '';

    const list = this.mergeWithChapterCitations(chapterCitations);

    // 1. 先找本章關聯法條完全匹配
    if (targetNum) {
      const chapterMatch = list.find((it) => it.isChapterCitation && it.lawNo === targetNum);
      if (chapterMatch) return chapterMatch;
    }

    // 2. 依條號精確匹配
    if (targetNum) {
      const exactNum = list.find((it) => it.lawNo === targetNum);
      if (exactNum) return exactNum;
    }

    // 3. 依 ID 或名稱匹配
    return list.find((it) => {
      return (
        it.id === clean ||
        it.lawName.includes(clean) ||
        (it.shortName && it.shortName.includes(clean)) ||
        (it.articleTitle && it.articleTitle.includes(clean))
      );
    });
  }

  /**
   * 根據搜尋關鍵字與標籤過濾法條清單
   */
  filterLaws(
    allLaws: LawDatabaseItem[],
    searchQuery: string,
    tabFilter: LawTabFilter
  ): LawDatabaseItem[] {
    let result = allLaws;

    // 分類過濾
    if (tabFilter === 'chapter') {
      result = result.filter((it) => it.isChapterCitation);
    } else if (tabFilter === 'general') {
      result = result.filter((it) => it.category === 'general');
    } else if (tabFilter === 'specific') {
      result = result.filter((it) => it.category === 'specific');
    } else if (tabFilter === 'external') {
      result = result.filter((it) => it.category === 'external');
    }

    // 搜尋關鍵字過濾
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const numMatch = q.match(/\d+/);
      const queryNum = numMatch ? numMatch[0] : null;

      result = result.filter((item) => {
        // 條號匹配優先
        if (queryNum && item.lawNo === queryNum) return true;
        if (item.lawName.toLowerCase().includes(q)) return true;
        if (item.shortName && item.shortName.toLowerCase().includes(q)) return true;
        if (item.articleTitle && item.articleTitle.toLowerCase().includes(q)) return true;
        if (item.chapter && item.chapter.toLowerCase().includes(q)) return true;
        if (item.part && item.part.toLowerCase().includes(q)) return true;
        if (item.summary && item.summary.toLowerCase().includes(q)) return true;
        if (item.bookNote && item.bookNote.toLowerCase().includes(q)) return true;
        if (item.content.toLowerCase().includes(q)) return true;
        return false;
      });
    }

    return result;
  }

  /**
   * 取得法務部全國法規資料庫單一搜尋網址
   */
  getMojSearchUrl(query: string): string {
    return `https://law.moj.gov.tw/Law/LawSearchResult.aspx?ty=ONEBAR&kw=${encodeURIComponent(query.trim())}`;
  }

  /**
   * 取得司法院裁判書檢索系統網址
   */
  getJudicialSearchUrl(query: string = ''): string {
    if (!query.trim()) {
      return 'https://law.judicial.gov.tw/FJUD/default.aspx';
    }
    return `https://law.judicial.gov.tw/FJUD/default.aspx`;
  }
}

export const lawDatabaseService = new LawDatabaseService();
