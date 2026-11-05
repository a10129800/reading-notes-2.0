import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  initPrivateStorage,
  saveMasterBook,
  getMasterBook,
  deleteMasterBook,
  saveMasterChapter,
  getMasterChapter,
  deleteMasterChapter,
  reorderMasterChapters,
  createBackup,
  restoreBackup,
  publishWhitelistedBooks,
  PRIVATE_DATA_DIR,
  PUBLIC_CONTENT_DIR,
} from '../server/storage';
import { createDefaultChapterSections, formatChapterToMarkdown } from '../src/utils/template';
import { Book, ChapterDetail } from '../src/types';

describe('M6 Real User Scenarios & Pre-Deployment Acceptance', () => {
  const m6Prefix = 'm6-test-';
  const testBookId = `${m6Prefix}reading-book`;

  beforeAll(() => {
    initPrivateStorage();
  });

  afterAll(() => {
    // Cleanup any m6 test data
    try { deleteMasterBook(testBookId); } catch {}
    const booksDir = path.join(PRIVATE_DATA_DIR, 'books');
    if (fs.existsSync(booksDir)) {
      const items = fs.readdirSync(booksDir);
      for (const item of items) {
        if (item.startsWith(m6Prefix)) {
          try { deleteMasterBook(item); } catch {}
        }
      }
    }
  });

  // =========================================================================
  // Section II: Real Book Management Workflow
  // =========================================================================
  it('executes full Section II book management workflow (steps 1 to 11)', () => {
    // 1. 新增書籍
    const initialBook: Book = {
      id: testBookId,
      title: '測試用閱讀書籍',
      author: '測試作者',
      category: '知識管理',
      status: 'private',
      readingStatus: 'reading',
      progress: 0,
      motivation: '驗證系統長期使用穩定性',
      introduction: '這是一本用於真實情境驗收的獨立測試書籍',
      coreIdea: '驗證完整生命週期',
      tags: ['知識管理', '測試'],
      chapters: [],
      publisher: '測試出版社',
      publishDate: '2026-11-05',
      isbn: '9780000000000',
      coverImage: '',
      startDate: '2026-11-05',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveMasterBook(initialBook);

    // 2. 修改書籍名稱
    let book = getMasterBook(testBookId)!;
    expect(book).not.toBeNull();
    book.title = '測試用閱讀書籍 (已修訂版)';

    // 3. 修改作者
    book.author = '資深讀者·王研究員';

    // 4. 修改分類
    book.category = '認知科學與決策';

    // 5. 修改閱讀狀態
    book.readingStatus = 'completed';
    book.progress = 100;
    saveMasterBook(book);

    const verifiedBook = getMasterBook(testBookId)!;
    expect(verifiedBook.title).toBe('測試用閱讀書籍 (已修訂版)');
    expect(verifiedBook.author).toBe('資深讀者·王研究員');
    expect(verifiedBook.category).toBe('認知科學與決策');
    expect(verifiedBook.readingStatus).toBe('completed');
    expect(verifiedBook.progress).toBe(100);

    // 6. 新增 10 個章節
    for (let i = 1; i <= 10; i++) {
      const chId = `ch-${String(i).padStart(2, '0')}`;
      saveMasterChapter(testBookId, {
        id: chId,
        bookId: testBookId,
        order: i,
        title: `第 ${i} 章：探索知識節點 ${i}`,
        subtitle: `副標題 ${i}`,
        completed: i <= 5,
        readingTimeMinutes: 15 + i,
        sections: createDefaultChapterSections(`第 ${i} 章`),
        quotes: [],
        relatedLinks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    book = getMasterBook(testBookId)!;
    expect(book.chapters).toHaveLength(10);
    expect(book.chapters[0].id).toBe('ch-01');
    expect(book.chapters[9].id).toBe('ch-10');

    // 7. 修改第 3 章內容
    const ch3 = getMasterChapter(testBookId, 'ch-03')!;
    expect(ch3).not.toBeNull();
    ch3.title = '第 3 章：已更新之核心專業篇章';
    ch3.sections.summary.mainArgument = '【修訂論述】非線性知識網路能大幅提升思維穿透力。';
    ch3.sections.keyTakeaways.takeaways.push('新增的第 4 條關鍵結論');
    saveMasterChapter(testBookId, ch3);

    const reloadedCh3 = getMasterChapter(testBookId, 'ch-03')!;
    expect(reloadedCh3.title).toBe('第 3 章：已更新之核心專業篇章');
    expect(reloadedCh3.sections.summary.mainArgument).toContain('非線性知識網路');
    expect(reloadedCh3.sections.keyTakeaways.takeaways).toContain('新增的第 4 條關鍵結論');

    // 8. 將第 8 章移動到第 2 位
    // Current chapter IDs order: ch-01, ch-02, ch-03, ch-04, ch-05, ch-06, ch-07, ch-08, ch-09, ch-10
    // Desired order with ch-08 at 2nd position (index 1): ch-01, ch-08, ch-02, ch-03, ch-04, ch-05, ch-06, ch-07, ch-09, ch-10
    const reorderedIds = [
      'ch-01', 'ch-08', 'ch-02', 'ch-03', 'ch-04',
      'ch-05', 'ch-06', 'ch-07', 'ch-09', 'ch-10'
    ];
    reorderMasterChapters(testBookId, reorderedIds);

    const reorderedBook = getMasterBook(testBookId)!;
    expect(reorderedBook.chapters[0].id).toBe('ch-01');
    expect(reorderedBook.chapters[1].id).toBe('ch-08');
    expect(reorderedBook.chapters[1].order).toBe(2);
    expect(reorderedBook.chapters[2].id).toBe('ch-02');

    // 9. 刪除第 5 章
    deleteMasterChapter(testBookId, 'ch-05');
    expect(getMasterChapter(testBookId, 'ch-05')).toBeNull();

    // 10. 重新開啟書籍
    const finalBook = getMasterBook(testBookId)!;

    // 11. 確認所有資料正確保存
    expect(finalBook.chapters).toHaveLength(9);
    expect(finalBook.chapters.some(c => c.id === 'ch-05')).toBe(false);
    expect(finalBook.chapters[1].id).toBe('ch-08');
    expect(finalBook.title).toBe('測試用閱讀書籍 (已修訂版)');
    expect(finalBook.author).toBe('資深讀者·王研究員');
  });

  // =========================================================================
  // Section III: 8-Section Note Editor Comprehensive Content Test
  // =========================================================================
  it('validates 8-section notes editor with rich Traditional Chinese, Markdown, tables, and special symbols', () => {
    const editorBookId = `${m6Prefix}editor-test-book`;
    saveMasterBook({
      id: editorBookId,
      title: '編輯器全面驗收專用書籍',
      author: '繁體中文作者',
      category: '深度閱讀',
      tags: ['8步筆記', 'Markdown驗收'],
      status: 'private',
      readingStatus: 'reading',
      progress: 50,
      motivation: '',
      introduction: '',
      coreIdea: '',
      chapters: [],
      publisher: '',
      publishDate: '',
      isbn: '',
      coverImage: '',
      startDate: '2026-11-05',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const richTableMarkdown = `| 概念維度 | 傳統直覺經驗 | 結構化認知模型 |
| :--- | :--- | :--- |
| **反應速度** | 極快 (< 0.5s) | 沉思 (需深度專注) |
| **失誤特徵** | 系統性偏差、盲區 | 參數邊界估算誤差 |
| **適用場景** | 重複性日常瑣事 | 重大架構決策與創新 |`;

    const richSections = {
      introduction: {
        overview: '本章深入研討「非線性思維與認知拓撲學」。\n\n這是一段跨段落的深入導讀，旨在挑戰傳統線性思考的根本假設。',
        learningGoals: [
          '🎯 掌握非線性反饋迴路 (Nonlinear Feedback Loops)',
          '📊 學會構建認知拓撲地圖 (Cognitive Topology Map)',
          '⚡ 應用於複雜分散式系統架構評估'
        ],
        coreQuestions: [
          '❓ 為什麼多數組織在擴展時會遭遇「複雜度非線性爆炸」？',
          '🔍 個體決策如何避免陷入局部最優解 (Local Optima)？'
        ]
      },
      summary: {
        mainArgument: '作者主張：「真實世界的重大問題全是非線性的；以線性因果觀處理非線性問題，本身就是災難的根源。」',
        contentDigest: '篇章從歷史案例展開，經由嚴謹的實驗數據證明反饋延遲對人類直覺的嚴重欺騙，最後提出「微步試錯與邊界探測」模型。',
        keyPoints: [
          '• 因果鏈條在時間維度上的高度延遲性',
          '• 局部優化往往導致全域性能崩塌',
          '• 建立韌性架構遠優於追求脆弱的精確預測'
        ]
      },
      professionalKnowledge: {
        definitions: '【反脆弱拓撲 (Antifragile Topology)】：系統在承受外界隨機性衝擊與壓力時，能夠自發利用波動性自我演化並提升強健度的拓撲結構。',
        terminology: [
          '反脆弱性 (Antifragility)',
          '自組織臨界性 (Self-Organized Criticality)',
          '冪律分佈 (Power-law Distribution)'
        ],
        theories: '源自複雜適應系統 (Complex Adaptive Systems, CAS) 與動態規劃理論。',
        citations: '參見原書第 88-112 頁；亦佐證自 Santa Fe Institute 2024 年度研究成果。'
      },
      vernacularExplanation: {
        plainText: '如果用白話來說：就像練肌肉，完全不動會萎縮，天天瘋狂重訓不休息會受傷斷裂；唯有給予適度的刺激、適當的休息營養，肌肉才會變得更強壯。複雜系統也是如此，過度保護只會變得弱不禁風。',
        everydayExamples: '以微服務系統為例：如果刻意每週在測試環境注入隨機網路延遲（混沌工程），團隊就能提早發現逾時熔斷機制的瑕疵，而不是等雙十一大特價時整個網站掛掉。'
      },
      caseAnalysis: {
        bookCases: '【原書案例】作者剖析了 2008 年金融危機期間，大型機構過度依賴常態分佈 VaR 模型估算極端風險，最終在肥尾事件中集體潰敗。',
        customCases: '【讀者延伸案例】在雲端高可用性架構設計中，如果僅做雙機備援而未做跨可用區 (Multi-AZ) 資料庫非同步複製，當資料中心遭遇物理斷網時依然會造成資料丟失。',
        application: '在評估技術方案時，強制執行「故障樹逆向分析 (Fault Tree Analysis)」，不問「會不會失敗」，只問「失敗時如何自癒」。'
      },
      keyTakeaways: {
        takeaways: [
          '接受不確定性，將注意力從「預測未來」轉向「提升適應能力」',
          '將單點致命弱點 (Single Point of Failure) 從架構中徹底消除',
          '重視反饋延遲，避免過度調整引發震盪'
        ],
        comparisonTable: richTableMarkdown,
        diagramMarkdown: `graph TD
  A[外部隨機衝擊] --> B{系統架構屬性}
  B -->|脆弱型| C[崩潰癱瘓]
  B -->|強韌型| D[維持原狀]
  B -->|反脆弱型| E[吸收能量並演化提升]`
      },
      personalInsights: {
        reflections: '讀完本章深感震撼。過往自己在做系統重構時，常試圖設計一套「能解決所有未來需求」的完美架構，實際上那只是打造了一座更龐大、更難維護的脆弱巨石 (Monolith)。',
        agreedPoints: '完全同意作者關於「過度優化等同於自我閹割適應力」的深刻論述。',
        disagreedPoints: '作者在第 4 節關於「完全摒棄短期進度規劃」的提議過於極端，在敏捷商業迭代中仍需要節奏感。',
        openQuestions: '如何在保持團隊敏捷交付的同時，留出足夠的資源培育反脆弱性？'
      },
      chapterSummary: {
        coreKnowledge: '本章奠定了「在波動中獲益」的架構心智，為後續篇章的決策工具箱提供了理論骨幹。',
        conclusions: '真正的專家追求的不是消滅波動，而是建構能夠在波動中茁壯成長的開放架構。',
        futureThoughts: '下一步可在內部研發流程中試行混沌工程實驗清單。'
      }
    };

    const chapterDetail: ChapterDetail = {
      id: 'rich-ch-01',
      bookId: editorBookId,
      order: 1,
      title: '第一章：非線性思維與認知拓撲學（專項驗收）',
      subtitle: '從脆弱到反脆弱的架構躍遷',
      completed: true,
      readingTimeMinutes: 25,
      sections: richSections,
      quotes: [
        {
          id: 'q-rich-01',
          quote: '風會吹熄蠟燭，卻能助長火勢。',
          page: 'p.3',
          note: '全書開篇最具震撼力的比喻。',
          tags: ['反脆弱', '波動性']
        }
      ],
      relatedLinks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save
    saveMasterChapter(editorBookId, chapterDetail);

    // Reload
    const reloaded = getMasterChapter(editorBookId, 'rich-ch-01')!;
    expect(reloaded).not.toBeNull();
    expect(reloaded.title).toBe('第一章：非線性思維與認知拓撲學（專項驗收）');

    // Verify all 8 sections are preserved without data corruption
    expect(reloaded.sections.introduction.overview).toContain('跨段落的深入導讀');
    expect(reloaded.sections.introduction.learningGoals).toHaveLength(3);
    expect(reloaded.sections.summary.mainArgument).toContain('真實世界的重大問題全是非線性的');
    expect(reloaded.sections.professionalKnowledge.definitions).toContain('反脆弱拓撲');
    expect(reloaded.sections.vernacularExplanation.everydayExamples).toContain('混沌工程');
    expect(reloaded.sections.caseAnalysis.bookCases).toContain('2008 年金融危機');
    expect(reloaded.sections.caseAnalysis.customCases).toContain('跨可用區 (Multi-AZ)');
    expect(reloaded.sections.keyTakeaways.comparisonTable).toContain('反應速度');
    expect(reloaded.sections.personalInsights.reflections).toContain('脆弱巨石 (Monolith)');
    expect(reloaded.sections.chapterSummary.coreKnowledge).toContain('在波動中獲益');

    // Verify Markdown export contains table and all 8 sections
    const md = formatChapterToMarkdown(reloaded.title, reloaded.sections);
    expect(md).toContain('| 概念維度 | 傳統直覺經驗 | 結構化認知模型 |');
    expect(md).toContain('## 01. 章節導讀');
    expect(md).toContain('## 08. 本章總結');

    // Clean test book
    deleteMasterBook(editorBookId);
  });

  // =========================================================================
  // Section V: Real Backup & Restore (Including Images & Attachments)
  // =========================================================================
  it('executes real backup and restore round-trip, verifying books, chapters, images, and attachments', () => {
    const backupTestBook1 = `${m6Prefix}bk-book-1`;
    const backupTestBook2 = `${m6Prefix}bk-book-2`;

    // 1. Create two books
    saveMasterBook({
      id: backupTestBook1,
      title: '備份書籍一',
      author: '作者甲',
      category: '管理',
      tags: ['備份A'],
      status: 'private',
      readingStatus: 'reading',
      progress: 40,
      motivation: '',
      introduction: '',
      coreIdea: '思想一',
      chapters: [],
      publisher: '',
      publishDate: '',
      isbn: '',
      coverImage: '',
      startDate: '2026-11-05',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    saveMasterChapter(backupTestBook1, {
      id: 'ch-01',
      bookId: backupTestBook1,
      order: 1,
      title: '篇章一',
      sections: createDefaultChapterSections('篇章一'),
      quotes: [],
      relatedLinks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    saveMasterBook({
      id: backupTestBook2,
      title: '備份書籍二',
      author: '作者乙',
      category: '哲學',
      tags: ['備份B'],
      status: 'draft',
      readingStatus: 'unread',
      progress: 0,
      motivation: '',
      introduction: '',
      coreIdea: '思想二',
      chapters: [],
      publisher: '',
      publishDate: '',
      isbn: '',
      coverImage: '',
      startDate: '2026-11-05',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. Put a test image into Reading-Notes-Private/images/
    const imagesDir = path.join(PRIVATE_DATA_DIR, 'images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
    const testImageName = `${m6Prefix}test-cover.png`;
    const testImagePayload = Buffer.from('FAKE_PNG_BINARY_HEADER_DATA_1234567890');
    fs.writeFileSync(path.join(imagesDir, testImageName), testImagePayload);

    // 3. Create full backup
    const backupInfo = createBackup();
    expect(backupInfo.filename).toContain('backup-reading-notes-');
    expect(backupInfo.sizeBytes).toBeGreaterThan(0);

    // Verify backup file is stored strictly in Reading-Notes-Private/backups/, NOT in public content
    const backupPath = path.join(PRIVATE_DATA_DIR, 'backups', backupInfo.filename);
    expect(fs.existsSync(backupPath)).toBe(true);
    expect(fs.existsSync(path.join(PUBLIC_CONTENT_DIR, backupInfo.filename))).toBe(false);

    // 4. Modify one book and delete a chapter and delete the test image
    const modBook = getMasterBook(backupTestBook1)!;
    modBook.title = '被惡意篡改的書名';
    saveMasterBook(modBook);

    deleteMasterChapter(backupTestBook1, 'ch-01');
    expect(getMasterChapter(backupTestBook1, 'ch-01')).toBeNull();

    // Delete image
    fs.unlinkSync(path.join(imagesDir, testImageName));
    expect(fs.existsSync(path.join(imagesDir, testImageName))).toBe(false);

    // 5. Execute restore
    const restoreResult = restoreBackup(backupInfo.filename);
    expect(restoreResult.restoredBooks).toBeGreaterThanOrEqual(2);
    expect(restoreResult.restoredChapters).toBeGreaterThanOrEqual(1);
    expect(restoreResult.restoredImages).toBeGreaterThanOrEqual(1);

    // 6. Verify restored state
    const restoredBook1 = getMasterBook(backupTestBook1)!;
    expect(restoredBook1.title).toBe('備份書籍一'); // Restored back!

    const restoredCh1 = getMasterChapter(backupTestBook1, 'ch-01')!;
    expect(restoredCh1).not.toBeNull();
    expect(restoredCh1.title).toBe('篇章一'); // Chapter restored back!

    // Verify image was restored
    expect(fs.existsSync(path.join(imagesDir, testImageName))).toBe(true);
    const restoredImgData = fs.readFileSync(path.join(imagesDir, testImageName));
    expect(restoredImgData.toString()).toBe('FAKE_PNG_BINARY_HEADER_DATA_1234567890');

    // Clean test books & test image
    deleteMasterBook(backupTestBook1);
    deleteMasterBook(backupTestBook2);
    try { fs.unlinkSync(path.join(imagesDir, testImageName)); } catch {}
    try { fs.unlinkSync(backupPath); } catch {}
  });

  // =========================================================================
  // Section IV: Search & Privacy Guarantee
  // =========================================================================
  it('guarantees search indexing strictly isolates private books and drafts from public search', () => {
    // Check books-manifest.json (the data source for public website search)
    const manifestPath = path.join(PUBLIC_CONTENT_DIR, 'books-manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    for (const b of manifest.books) {
      expect(b.status).toBe('public');
    }
  });
});

