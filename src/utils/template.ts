import { ChapterSections } from '../types';

export function createDefaultChapterSections(title: string = '新章節'): ChapterSections {
  return {
    introduction: {
      overview: `本章重點探討「${title}」的核心主旨與在全書架構中的承接地位。`,
      learningGoals: [
        '理解本章的核心定義與主要脈絡',
        '辨析相關理論與實際應用的界線',
        '掌握能應用於日常與工作決策的核心思維模型'
      ],
      coreQuestions: [
        '作者在本章嘗試回答的最根本問題是什麼？',
        '這個觀點挑戰了傳統認知中的哪一項假定？'
      ]
    },
    summary: {
      mainArgument: '作者主張現代人在面對複雜問題時，容易依賴經驗捷徑，必須透過結構化拆解與客觀檢視才能做出更穩健的判斷。',
      contentDigest: '章節依序由問題現象切入，深入拆解運作機制，並透過實證研究佐證論述，最後提出具體原則。',
      keyPoints: [
        '直覺思考與理性分析的平衡點',
        '系統性偏差的形成根源',
        '從認知盲區中建立自我校正迴路'
      ]
    },
    professionalKnowledge: {
      definitions: '【核心術語定義】本章提及的關鍵概念具備明確的學術或產業脈絡定義。',
      terminology: [
        '認知邊界 (Cognitive Boundary)',
        '反脆弱架構 (Antifragile Framework)',
        '回饋延遲 (Feedback Latency)'
      ],
      theories: '建基於決策心理學與系統動力學的研究範式，強調非線性系統中的連鎖反應。',
      citations: '參照原書第 45-62 頁論述；亦與現代組織行為學實驗數據相吻合。'
    },
    vernacularExplanation: {
      plainText: '如果用白話來說：就像開車時導航系統會預告塞車，我們平常的大腦習慣「抄近路」，但遇到大塞車時，盲目依賴直覺捷徑反而會卡在死巷子裡，這時候需要停下來看全局地圖。',
      everydayExamples: '以個人理財或團隊專案為例：直覺會讓我們追求立即的回報或快速交差，但深層架構的疏忽往往在三個月後爆發危機。'
    },
    caseAnalysis: {
      bookCases: '【原書案例】作者引用了 1990 年代某跨國工程團隊因為忽略底層警訊，導致專案預算超支 300% 的經典歷史案例。',
      customCases: '【讀者延伸案例】在軟體系統重構時，若僅為求快而只修補表面 bug，未重構核心資料庫鎖定機制，終將在高並發時徹底癱瘓。',
      application: '在評估重大方案時，應設置「前置檢驗會議 (Pre-mortem)」，預先假定失敗並逆向追查原由。'
    },
    keyTakeaways: {
      takeaways: [
        '永遠先釐清根本假設，再進行細節推導',
        '原書觀點與個人經驗的交叉驗證是內化知識的唯一途徑',
        '建立可重複執行的微型檢查清單'
      ],
      comparisonTable: `| 比較維度 | 直覺經驗模式 | 結構化分析模式 |
| :--- | :--- | :--- |
| **反應速度** | 極快 (< 1 秒) | 較慢 (需深思) |
| **認知成本** | 低負荷 | 高專注度 |
| **失誤特徵** | 系統性偏差、盲區 | 計算與資訊缺漏 |
| **適用情境** | 熟悉日常情境 | 重大決策、未知探索 |`,
      diagramMarkdown: `flowchart TD
  A[輸入問題 / 觀察現象] --> B{是否為重複已知情境?}
  B -- 是 --> C[啟動直覺經驗決策]
  B -- 否 --> D[啟動 8 步結構化檢驗]
  D --> E[查驗原書案例與專業依據]
  E --> F[產出客觀行動策略]`
    },
    personalInsights: {
      reflections: '閱讀完這章後，深刻反省自己在過去專案中過於依賴經驗主義的盲點。',
      agreedPoints: '強烈認同作者所言：「未經檢驗的信念只是習慣，而非知識」。',
      disagreedPoints: '作者在第 3 節提出的執行建議過於理想化，在資源極度受限的中小團隊中落地成本過高。',
      openQuestions: '如何在保持決策敏捷度的同時，維持結構化分析的高品質？'
    },
    chapterSummary: {
      coreKnowledge: '本章建立了「由表象深入底層機制」的認知架構，為後續章節的實務工具奠定了理論基石。',
      conclusions: '真正的專業不在於知道所有答案，而在於知道何時該質疑自己的直覺。',
      futureThoughts: '下一步可在團隊專案或個人閱讀工作流中導入本章的檢查清單。'
    }
  };
}

export function formatChapterToMarkdown(title: string, sections: ChapterSections): string {
  return `# ${title}

---

## 01. 章節導讀

### 本章介紹
${sections.introduction.overview}

### 學習目標
${sections.introduction.learningGoals.map(g => `- ${g}`).join('\n')}

### 核心問題
${sections.introduction.coreQuestions.map(q => `- ${q}`).join('\n')}

---

## 02. 核心摘要

### 作者主要論述
${sections.summary.mainArgument}

### 章節內容整理
${sections.summary.contentDigest}

### 重要觀點
${sections.summary.keyPoints.map(p => `- ${p}`).join('\n')}

---

## 03. 專業知識

### 正式定義
${sections.professionalKnowledge.definitions}

### 專業術語
${sections.professionalKnowledge.terminology.map(t => `- \`${t}\``).join('\n')}

### 理論與學說
${sections.professionalKnowledge.theories}

### 相關研究與重要依據
${sections.professionalKnowledge.citations}

---

## 04. 白話解釋

### 白話重新詮釋
${sections.vernacularExplanation.plainText}

### 生活化例子
${sections.vernacularExplanation.everydayExamples}

---

## 05. 案例分析

### 原書案例（原作者提出）
${sections.caseAnalysis.bookCases}

### 讀者自行舉例（延伸實務）
${sections.caseAnalysis.customCases}

### 實際應用與理論關聯
${sections.caseAnalysis.application}

---

## 06. 重點整理

### 條列式重點
${sections.keyTakeaways.takeaways.map(t => `- ${t}`).join('\n')}

### 比較表格
${sections.keyTakeaways.comparisonTable || '(無)'}

### 流程圖 / 結構圖
\`\`\`mermaid
${sections.keyTakeaways.diagramMarkdown || ''}
\`\`\`

---

## 07. 個人心得

### 閱讀感想與理解
${sections.personalInsights.reflections}

### 認同的觀點
${sections.personalInsights.agreedPoints}

### 不認同的觀點
${sections.personalInsights.disagreedPoints}

### 延伸疑問
${sections.personalInsights.openQuestions}

---

## 08. 本章總結

### 核心知識
${sections.chapterSummary.coreKnowledge}

### 重要結論
${sections.chapterSummary.conclusions}

### 延伸思考
${sections.chapterSummary.futureThoughts}
`;
}
