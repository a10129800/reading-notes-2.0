export type BookStatus = 'public' | 'private' | 'draft';
export type ReadingState = 'unread' | 'reading' | 'completed' | 'abandoned';

export interface QuoteItem {
  id: string;
  quote: string;
  sourceChapterId?: string;
  sourceChapterTitle?: string;
  page?: string | number;
  note?: string;
  tags?: string[];
}

export interface RelatedLink {
  id: string;
  targetBookId: string;
  targetBookTitle: string;
  targetChapterId?: string;
  targetChapterTitle?: string;
  description: string;
  conceptName: string;
}

// 01. 章節導讀
export interface SectionIntroduction {
  overview: string;           // 本章介紹
  learningGoals: string[];    // 學習目標
  coreQuestions: string[];    // 核心問題
}

// 02. 核心摘要
export interface SectionSummary {
  mainArgument: string;       // 作者主要論述
  contentDigest: string;      // 章節內容整理
  keyPoints: string[];        // 重要觀點
}

// 03. 專業知識
export interface SectionProfessionalKnowledge {
  definitions: string;        // 正式定義
  terminology: string[];      // 專業術語
  theories: string;           // 理論與學說
  citations: string;          // 相關研究與重要依據（含來源出處）
}

// 04. 白話解釋
export interface SectionVernacularExplanation {
  plainText: string;          // 使用一般人能理解的語言重新解釋
  everydayExamples: string;   // 生活化例子
}

// 05. 案例分析 (嚴格區分原書案例與自行舉例)
export interface SectionCaseAnalysis {
  bookCases: string;          // 書中案例 (原作者提出)
  customCases: string;        // 自行舉例 (讀者個人延伸)
  application: string;        // 實際應用與案例理論關聯
}

// 06. 重點整理
export interface SectionKeyTakeaways {
  takeaways: string[];        // 條列式重點
  comparisonTable?: string;   // 比較表格 (Markdown 格式)
  diagramMarkdown?: string;   // 流程圖 / 心智圖 (Mermaid 或文字心智圖)
}

// 07. 個人心得
export interface SectionPersonalInsights {
  reflections: string;        // 閱讀感想與個人理解
  agreedPoints: string;       // 認同的觀點
  disagreedPoints: string;    // 不認同的觀點
  openQuestions: string;      // 延伸疑問
}

// 08. 本章總結
export interface SectionChapterSummary {
  coreKnowledge: string;      // 核心知識
  conclusions: string;        // 重要結論
  futureThoughts: string;     // 延伸思考
}

export interface ChapterSections {
  introduction: SectionIntroduction;
  summary: SectionSummary;
  professionalKnowledge: SectionProfessionalKnowledge;
  vernacularExplanation: SectionVernacularExplanation;
  caseAnalysis: SectionCaseAnalysis;
  keyTakeaways: SectionKeyTakeaways;
  personalInsights: SectionPersonalInsights;
  chapterSummary: SectionChapterSummary;
}

export interface ChapterMeta {
  id: string;
  bookId: string;
  order: number;
  title: string;
  subtitle?: string;
  completed?: boolean;
  readingTimeMinutes?: number;
  quotesCount?: number;
  updatedAt: string;
}

export interface ChapterDetail extends ChapterMeta {
  sections: ChapterSections;
  quotes: QuoteItem[];
  relatedLinks: RelatedLink[];
  rawMarkdown?: string;
  createdAt: string;
}

export interface Book {
  id: string;                         // 唯一英文/數字代號，如 'think-fast-slow'
  title: string;                      // 書名
  subtitle?: string;                  // 副標題
  author: string;                     // 作者
  publisher: string;                  // 出版社
  publishDate: string;                // 出版日期
  isbn: string;                       // ISBN
  coverImage: string;                 // 書籍封面圖片路徑或Base64
  category: string;                   // 書籍分類 (如：心理學、軟體工程、哲學等)
  tags: string[];                     // 標籤
  startDate: string;                  // 閱讀開始日期
  finishDate?: string;                // 閱讀完成日期
  status: BookStatus;                 // 'public' | 'private' | 'draft'
  readingStatus: ReadingState;        // 'unread' | 'reading' | 'completed' | 'abandoned'
  progress: number;                   // 閱讀進度 0 - 100
  totalPages?: number;                // 總頁數
  currentPage?: number;               // 目前頁數
  motivation: string;                 // 閱讀動機
  introduction: string;               // 書籍介紹
  coreIdea: string;                   // 全書核心思想
  chapters: ChapterMeta[];            // 章節列表 (保持原書目錄層級與順序)
  quotes?: QuoteItem[];               // 全書收錄金句
  createdAt: string;
  updatedAt: string;
}

export interface PublicBooksManifest {
  version: string;
  generatedAt: string;
  siteTitle: string;
  siteDescription: string;
  totalPublicBooks: number;
  categories: string[];
  tags: string[];
  books: Book[];
}

export interface SearchResultItem {
  bookId: string;
  bookTitle: string;
  chapterId?: string;
  chapterTitle?: string;
  sectionKey?: keyof ChapterSections | 'coreIdea' | 'introduction';
  sectionLabel: string;
  snippet: string;
  matchScore: number;
  status: BookStatus;
}

export interface DashboardStats {
  totalBooks: number;
  publicBooks: number;
  privateBooks: number;
  draftBooks: number;
  completedBooks: number;
  readingBooks: number;
  totalChapters: number;
  totalQuotes: number;
  categoriesCount: Record<string, number>;
  recentBooks: Book[];
}

export interface PublishPipelineStage {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'skipped' | 'waiting';
  message?: string;
  details?: any;
}

export interface PublishPipelineResult {
  taskId?: string;
  success: boolean;
  timestamp: string;
  stages: Record<string, PublishPipelineStage>;
  summary: {
    publishedBooks: string[];
    publishedCount: number;
    removedCount: number;
    commitHash?: string;
    pushed: boolean;
    hasContentChanges?: boolean;
    actionsUrl?: string;
    pagesUrl: string;
    failedStep?: string;
  };
  error?: string;
}

export interface DeploymentStatus {
  status: 'idle' | 'queued' | 'in_progress' | 'completed' | 'unknown';
  conclusion?: 'success' | 'failure' | 'cancelled' | null;
  runId?: number;
  commitHash?: string;
  htmlUrl?: string;
  updatedAt?: string;
  failedStep?: string;
  pagesStatus?: 'pending' | 'in_progress' | 'success' | 'failed' | 'unknown';
  pagesDeploymentId?: number;
  pagesDeploymentSha?: string;
  isMatchSha?: boolean;
}

export interface PublishRecord {
  taskId: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'success' | 'failed' | 'skipped';
  commitHash?: string;
  pushed: boolean;
  hasContentChanges: boolean;
  actionsRunId?: number;
  actionsConclusion?: 'success' | 'failure' | 'cancelled';
  failedStep?: string;
  pagesDeploymentId?: number;
  pagesDeploymentSha?: string;
  pagesStatus?: 'success' | 'in_progress' | 'failed' | 'unknown';
  error?: string;
  publishedBooks: string[];
  stages: Record<string, PublishPipelineStage>;
}

