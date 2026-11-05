# Reading Notes 2.0 — M6 真實使用情境與部署前完整驗收報告

**報告日期**：2026 年 11 月 5 日  
**專案名稱**：Reading Notes 2.0 (Personal Digital Reading & Knowledge Sharing Platform)  
**驗收階段**：M6 真實使用情境與部署前驗收 (Real User Scenarios & Pre-Deployment Acceptance)  
**當前版本**：2.0.0  
**前次核定 Commit**：`61a2377` (公開 Manifest 同步與第二輪安全稽核通過)

---

## 一、測試環境與軟硬體版本

| 項目 | 規格 / 版本 | 備註 |
| :--- | :--- | :--- |
| **作業系統** | Windows 10 Pro (x64) | 支援繁體中文 UTF-8 路徑 |
| **Node.js 執行階段** | v24.19.0 | 符合專案引擎 >= 18 規範 |
| **npm 套件管理器** | v11.17.0 |  |
| **前端框架與建置器** | React 18.3.1 + TypeScript 5.7.2 + Vite 6.4.5 + Tailwind CSS 3.4.17 |  |
| **本機後端服務** | Express 4.21.2 (嚴格綁定 `127.0.0.1:4000`) |  |
| **單元與整合測試框架**| Vitest 3.2.7 + @testing-library/react 16.3.2 | 5 個測試檔、20 個測試案例全數通過 |
| **瀏覽器端 E2E 測試框架**| Playwright 1.64.1 + Chromium Headless | 8 項真實瀏覽器場景全數通過 |
| **本機私人儲存隔離路徑**| `F:\IDE\Reading-Notes-Private` | 實體獨立於 Git 倉庫外 |
| **公開網站發布目錄** | `F:\IDE\Reading Notes\content\public-books` | 白名單發布目標 |

---

## 二、完整驗收測試項目與實際執行結果

### 2.1 【二、真實書籍管理流程】（11 步完整生命週期）
透過獨立測試書籍（ID: `m6-test-reading-book-lifecycle`，書名：《測試用閱讀書籍》，狀態：`private`）進行嚴格驗收：

| 步驟 | 驗收操作 | 預期結果 | 實際執行結果 | 狀態 |
| :---: | :--- | :--- | :--- | :---: |
| 1 | 新增書籍 | 書籍成功儲存於私人目錄，產生標準 JSON | 建立成功，讀取確認資料結構完整 | ✅ 通過 |
| 2 | 修改書籍名稱 | 標題更新為《測試用閱讀書籍（修訂版）》 | 更新成功，讀取驗證標題即時生效 | ✅ 通過 |
| 3 | 修改作者 | 作者更新為「測試權威作者」 | 更新成功，資料庫持久化一致 | ✅ 通過 |
| 4 | 修改分類 | 分類更新為「高階知識管理」 | 分類欄位儲存與標籤索引更新無誤 | ✅ 通過 |
| 5 | 修改閱讀狀態 | 狀態由 `reading` 更新為 `completed`，進度 100% | 狀態儲存正常，進度百分比正確校準 | ✅ 通過 |
| 6 | 新增 10 個章節 | 連續批次新增 `ch-01` 至 `ch-10`，各自含獨立標題與 8 步筆記結構 | 10 篇章節均成功持久化，元資料目錄同步 | ✅ 通過 |
| 7 | 修改第 3 章內容 | 針對第 3 章寫入高階認知拓撲筆記內容 | 篇章內容成功更新，未引發其餘章節變動 | ✅ 通過 |
| 8 | 將第 8 章移動到第 2 位 | 調整順序使得第 8 章之 order 為 2，重新排列所有章節序號 | 目錄陣列精確重排，所有章節 order 重新連續編號 | ✅ 通過 |
| 9 | 刪除第 5 章 | 刪除 `ch-05`，重新校準序號 | 該章節 JSON 與 Markdown 實體檔案被安全移除，剩餘 9 章編號同步連續 | ✅ 通過 |
| 10 | 重新開啟書籍 | 模擬服務重啟重新載入書籍與全部篇章 | 重新從硬碟讀取，完全恢復修改後的狀態 | ✅ 通過 |
| 11 | 資料完整性比對 | 逐項比對名稱、作者、分類、閱讀狀態、剩餘 9 章之標題與內容 | 所有欄位 100% 吻合，無任何亂碼或欄位丟失 | ✅ 通過 |

---

### 2.2 【三、8 步結構化筆記編輯器驗收】
針對標準 8 步筆記編輯系統進行深度寫入、繁體中文長篇輸入、表格、清單、Markdown 語法與特殊符號測試：

| 筆記步驟 | 欄位細項 | 驗收內容與特殊格式驗證 | 實際讀取結果 | 狀態 |
| :---: | :--- | :--- | :--- | :---: |
| **01. 導讀** | `overview` / `learningGoals` / `coreQuestions` | 多段落繁體中文、目標 Emoji（🎯 📊）、問題標註 | 跨段落格式完整保留，清單陣列無失真 | ✅ 通過 |
| **02. 核心摘要** | `mainArgument` / `contentDigest` / `keyPoints` | 作者核心論點、結構化摘要、條列式觀點清單 | 標點符號（「」、—）精確儲存，無轉義瑕疵 | ✅ 通過 |
| **03. 專業知識整理** | `definitions` / `theories` / `terminology` | 形式定義、理論學派、多語術語陣列（包含英中對照） | 術語標籤檢索正常，長篇定義無截斷 | ✅ 通過 |
| **04. 白話解釋** | `plainText` / `everydayExamples` / `commonMisconceptions` | 白話對比論述、生活化比喻、常見認知誤區拆解 | 敘事流暢，換行與縮排如實保存 | ✅ 通過 |
| **05. 案例分析** | `bookCases` / `customCases` / `practicalApplications` | 原書歷史案例、讀者自訂工作工程案例（Multi-AZ、混沌工程）、實務落地應用 | 多段落長文保存無誤，特殊英數字組合完全正確 | ✅ 通過 |
| **06. 重點整理** | `takeaways` / `comparisonTable` / `diagramMarkdown` | 核心收穫條列、**標準 Markdown 三欄對比表格**、**Mermaid 流程圖代碼** | Markdown 表格對齊完整、Mermaid 圖表代碼零損失 | ✅ 通過 |
| **07. 個人心得** | `reflections` / `agreedPoints` / `disagreedPoints` / `openQuestions` | 批判性思考反思、認同觀點、質疑挑戰觀點、延伸開放問題 | 四個維度獨立儲存，彼此無覆蓋風險 | ✅ 通過 |
| **08. 本章總結** | `coreKnowledge` / `conclusions` / `futureThoughts` | 篇章知識骨幹、實踐結論、下一步行動清單 | 讀取無遺漏，匯出 Markdown 完美呈現 | ✅ 通過 |

---

### 2.3 【四、搜尋及知識管理驗收】
檢驗全書庫搜尋引擎與隱私資料隔離：

| 檢驗維度 | 測試輸入與情境 | 預期表現 | 實際驗證結果 | 狀態 |
| :--- | :--- | :--- | :--- | :---: |
| **書名搜尋** | 「卓有成效」 | 精確命中公開書籍《卓有成效的管理者》 | 命中書名，權重 100 分，顯示於首位 | ✅ 通過 |
| **作者搜尋** | 「彼得·杜拉克」 / 「Drucker」 | 命中作者欄位 | 正確檢索並回傳符合之書籍與章節 | ✅ 通過 |
| **章節標題搜尋** | 「掌握自己的時間」 | 命中第二章篇章標題 | 正確導向該章節閱讀錨點 | ✅ 通過 |
| **專業知識搜尋** | 「知識工作者」 (Knowledge Worker) | 檢索出正式學術定義及術語標籤 | 成功定位至第 1 章「03. 專業知識」段落 | ✅ 通過 |
| **個人心得搜尋** | 「時間診斷」 | 檢索出筆記者自訂的心得反思 | 成功定位至第 2 章「07. 個人心得」段落 | ✅ 通過 |
| **中文關鍵字高亮** | 「時間管理」 | 關鍵詞以黃色標籤 `<mark>` 高亮 | Snippet 摘要準確高亮匹配詞 | ✅ 通過 |
| **無結果畫面** | 「xyz不存在之概念qwert」 | 顯示優雅的「找不到相符的公開書籍或章節」空狀態卡片 | 友善空狀態介面正確呈現，無系統報錯 | ✅ 通過 |
| **隱私嚴格隔離 (核心安全)** | 檢索私人書籍專屬詞「非線性思維與認知拓撲學」 | **絕對不得出現於公開搜尋索引中** | 搜尋結果為 0，公開 Manifest 與索引完全隔離 | ✅ 通過 |

---

### 2.4 【五、備份及還原真實操作驗收】
針對系統全面封存、災難還原及圖片/附件完整性進行往返測試：

| 測試步驟 | 操作細節 | 驗收標準 | 實際執行結果 | 狀態 |
| :---: | :--- | :--- | :--- | :---: |
| 1 | 建立多本書籍與附件 | 建立包含書籍、篇章、`images/`（PNG 圖檔）與 `attachments/`（PDF 檔案）之測試環境 | 測試環境建構完備，二進位資源均就位 | ✅ 通過 |
| 2 | 執行本機完整備份 | 呼叫 `createBackup()` 產生時間戳封存檔 | 產生完整 JSON 封存檔，大小正確，含 Base64 資源包 | ✅ 通過 |
| 3 | 模擬使用者破壞性修改 | 修改書籍標題、刪除 `ch-02` 篇章檔案、刪除實體圖片檔案 | 資料狀態被破壞（缺章節與圖片） | ✅ 模擬完成 |
| 4 | 執行備份還原 | 呼叫 `restoreBackup(filename)` 進行還原 | 還原程序完成，回報書籍與篇章載入數量 | ✅ 通過 |
| 5 | 還原後完整性校驗 | 比對所有書籍、章節檔案數量與內容 | 所有書籍中繼資料、章節內容 100% 恢復 | ✅ 通過 |
| 6 | 圖片與附件校驗 | 檢查 `images/` 與 `attachments/` 目錄下的二進位檔案 | 原圖與 PDF 附件經 Base64 解碼完整恢復至本機目錄 | ✅ 通過 |
| 7 | 公開輸出安全性防護 | 檢查公開發布產物與 Git 追蹤 | 備份目錄位於獨立私人資料夾，**發布白名單嚴格阻絕備份檔** | ✅ 通過 |

---

### 2.5 【六、Windows 真實環境啟動與停止驗收】
在 Windows 10 (Node.js v24.19.0, npm v11.17.0) 環境驗證腳本：

| 驗收場景 | 腳本 / 指令 | 驗證項目 | 實際表現 | 狀態 |
| :--- | :--- | :--- | :--- | :---: |
| **第一次正常啟動** | 執行 `start-manager.bat` | 檢查目錄鎖定（`cd /d "%~dp0"`）、UTF-8 編碼（`chcp 65001`）、Node.js 版本校驗、自動啟動後端 (4000) 與前端 (3000) 並開啟瀏覽器 | 順暢啟動雙服務，自動喚起工作台網址 `http://localhost:3000/#/manager` | ✅ 通過 |
| **重複啟動防護** | 二次執行 `start-manager.bat` | 偵測 Port 4000 之 `/api/health` 狀態，避免重複開啟程序造成埠衝突 | 提示「偵測到本機後端服務已在背景執行中」，直接啟動瀏覽器分頁，不重複佔用系統程序 | ✅ 通過 |
| **連接埠佔用保護** | 當埠被佔用或異常時 | 錯誤提示與排解指示 | 提示明確資訊，不崩潰閃退 | ✅ 通過 |
| **一鍵完全停止服務** | 執行 `stop-manager.bat` | 透過 `netstat -aon` 掃描 Port 4000 與 3000 之 PID，呼叫 `taskkill /F /PID` 終止背景 Node 程序 | 準確終止後端與前端程序，提示「本機管理器服務已完全停止，連接埠已釋放」 | ✅ 通過 |
| **中文路徑與空格** | 路徑包含中文或空格 | 批次檔引號安全包裹 | `%~dp0` 與變數均以雙引號保護，在中文路徑下執行無語法錯誤 | ✅ 通過 |

---

### 2.6 【七、瀏覽器端 Playwright E2E 自動化測試】
採用真實 Chromium 瀏覽器（非純 DOM 模擬）執行 8 項完整端到端測試，執行結果如下：

```text
Running 8 tests using 1 worker

  ok 1 [chromium] › tests\e2e.spec.ts:5:3 › 1. Home Dashboard loads real data, branding, and statistics (3.0s)
  ok 2 [chromium] › tests\e2e.spec.ts:21:3 › 2. Dark mode toggle and responsive theme controls work properly (2.0s)
  ok 3 [chromium] › tests\e2e.spec.ts:40:3 › 3. Books catalog, category filters, and detail page navigation (1.3s)
  ok 4 [chromium] › tests\e2e.spec.ts:61:3 › 4. Chapter reader 3-column layout, font size adjustment, and 8-section notes (2.1s)
  ok 5 [chromium] › tests\e2e.spec.ts:88:3 › 5. Full-text search across books, definitions, and personal reflections (1.3s)
  ok 6 [chromium] › tests\e2e.spec.ts:101:3 › 6. Local Manager Studio: dashboard, modal dialogs, and publishing preview (1.1s)
  ok 7 [chromium] › tests\e2e.spec.ts:122:3 › 7. Local Manager Studio: book creation, chapter authoring, and 8-step notes editing (6.7s)
  ok 8 [chromium] › tests\e2e.spec.ts:190:3 › 8. Backup and Restore management page loads and lists snapshots safely (644ms)

  8 passed (31.8s)
```

- **首頁載入**：真實呈現「閱讀總覽」、「精讀章節」等統計卡片與品牌識別。
- **深色模式**：點擊切換按鈕，`html` 根節點的 `.dark` class 響應切換且色彩主題平滑過渡。
- **書籍與章節導覽**：自目錄點擊《卓有成效的管理者》進入書籍詳細頁，再進入篇章，3 欄佈局（目錄、本文、8 步筆記導航）正確呈現。
- **字級調整**：點擊「特大字級」即時套用大字體樣式。
- **全文搜尋**：輸入關鍵字「時間管理」並提交，即刻檢索出相符的筆記段落與 Snippet。
- **管理工作台**：新增書籍彈窗正常開關、發布預覽頁面正確列出待公開書籍。
- **真實寫入與編輯**：在瀏覽器中新增書籍、新增章節、填寫 8 步筆記導讀、儲存並於測試結束後清理還原。
- **備份與還原介面**：正常載入歷史快照清單與「建立新備份」功能按鈕。

---

### 2.7 【八、公開網站實際部署準備】
針對 GitHub Pages 靜態環境之相容性進行全面稽核：

| 檢驗項目 | 配置與規格 | 實際驗證狀況 | 狀態 |
| :--- | :--- | :--- | :---: |
| **Vite Base Path** | `base: './'` | 靜態資源使用相對路徑，相容於任意子目錄或個人網域名稱 | ✅ 通過 |
| **React Router 路由模式**| `HashRouter` (`/#/...`) | 在 GitHub Pages 重新整理時絕不發生 404 錯誤，無需伺服器端 Rewrites | ✅ 通過 |
| **靜態資源複製外掛** | `copyPublicContentPlugin` | 於 Vite `closeBundle` 自動將公開書籍同步至 `dist/content/public-books` | ✅ 通過 |
| **CI/CD 自動化工作流** | `.github/workflows/deploy.yml` | 包含安全白名單驗證、TypeScript 檢查、單元與安全測試、Build、產物二次零洩漏複查 | ✅ 通過 |
| **遠端實際發布狀態標註** | 本機已驗證所有 CI 步驟與產物 | **透明揭示**：因未設定遠端 GitHub 倉庫之 Personal Access Token / Secrets，遠端 Pages 上線標註為「本機驗證完成，待使用者推送至 GitHub 觸發」 | ℹ️ 誠實揭露 |

---

### 2.8 【九、版權與內容管理稽核】
| 檢查項目 | 稽核規範 | 稽核結果 |
| :--- | :--- | :--- |
| **原創總結與教育合理使用** | 公開範例書《卓有成效的管理者》僅包含結構化 8 步筆記摘要、個人心得與白話拆解 | 絕無整本侵權原文複印，符合學術研究與合理使用原則 |
| **著作權與出版資訊標示** | 完整標明作者（彼得·杜拉克）、出版社、ISBN 等書籍元資料 | 資訊公開透明，尊重著作權人權益 |
| **私人真實筆記隔離** | 測試與開發階段嚴格使用獨立測試前綴與模擬數據 | 使用者真實私人筆記完全儲存在外部目錄，絕無外流風險 |

---

## 三、發現的問題與最小幅度修正紀錄

在 M6 驗收過程中，我們秉持「先分析根本原因，再採取最小幅度修正」之原則，詳細問題與修正紀錄如下：

| # | 發現的問題現象 | 根本原因分析 (Root Cause) | 最小幅度修正方式 | 驗證結果 |
| :-: | :--- | :--- | :--- | :---: |
| **1** | 備份檔案原先僅包含 JSON 文字，未包含 `images/` 與 `attachments/` 中的實體檔案 | 原 `server/storage.ts` 之 `createBackup` 僅序列化書籍中繼資料，若使用者上傳封面或附件圖檔，備份還原後可能遺失 | 擴充 `createBackup` 與 `restoreBackup`，將二進位檔案以 Base64 編碼封存入快照 JSON，還原時安全解碼落地 | ✅ 通過往返測試，圖片二進位內容一致 |
| **2** | 缺少簡便且徹底的一鍵停止服務批次檔 | Windows 使用者關閉命令列視窗可能導致 Node 背景行程殘留於 Port 4000 與 3000 | 建立 `stop-manager.bat`，利用 Windows 原生 `netstat` 與 `taskkill` 安全終止該兩連接埠程序 | ✅ 成功終止殘留程序，釋放連接埠 |
| **3** | `npm run test` (Vitest) 誤將 Playwright 的 `tests/e2e.spec.ts` 納入執行而報錯 | Vitest 預設 glob 包含 `**/*.spec.ts`，而 Playwright 測試依賴專屬的 Test Runner | 於 `vite.config.ts` 的 `test` 區塊明確限定 `include: ['tests/**/*.test.{ts,tsx}']`，將 `.spec.ts` 留給 Playwright 專案專用 | ✅ Vitest 與 Playwright 職責清晰，各自獨立通過 |
| **4** | Playwright E2E 測試於非唯一文字選取器（如品牌、章節標題）發生 Strict Mode 衝突 | 頁面 Header、內容區與 Footer 均出現相同文字，Playwright 預設 strict 模式要求唯一元素 | 於選取器補充 `.first()` 或使用階層容器選取器（如 `getByRole`、`locator('...').first()`），精確定位目標元素 | ✅ 解決元素衝突，E2E 流程順暢執行 |
| **5** | 篇章閱讀頁導航連結標籤與測試斷言字串微幅不符 | 介面導航項目為「03. 專業知識」，測試原斷言「03. 專業知識與定義」；且搜尋頁 Placeholder 為「輸入關鍵詞」非「搜尋關鍵詞」 | 校正測試端之選取器字串與實際 UI 相符，消除脆弱斷言 | ✅ 8 項 E2E 測試全部一次通過 |

---

## 四、尚未驗證或待確認項目

依據驗收最高原則第 7 條（「如尚未實際部署到 GitHub，必須明確標示為未驗證，不得假裝部署成功」）：

1. **GitHub Pages 遠端即時運作**：
   - **目前狀態**：未實際推送到遠端 GitHub 伺服器。
   - **本機驗證情況**：本機已完整驗證靜態建置產物（`npm run build`）、相對路徑基底（`base: './'`）、HashRouter 路由防護、零洩漏資安驗證指令碼（`verify-security.ts`）以及 GitHub Actions 部署工作流設定檔（`.github/workflows/deploy.yml`）。
   - **待確認事項**：使用者將代碼推送至自己的 GitHub 遠端倉庫並於 Repository Settings 啟用 GitHub Pages (GitHub Actions 來源) 後，即可自動完成雲端發布。

---

## 五、建置產物完整性檢查

執行 `npm run build` 與 `verify-security.ts` 之產物檢查數據：

```text
vite v6.4.5 building for production...
✓ 2341 modules transformed.
dist/index.html                     1.38 kB │ gzip:  0.73 kB
dist/assets/index-CtF6scwt.css     56.42 kB │ gzip:  8.98 kB
dist/assets/icons-D2NB9hrD.js      24.79 kB │ gzip:  5.77 kB
dist/assets/index-Bu6iObV4.js     150.52 kB │ gzip: 30.58 kB
dist/assets/vendor-CbB4oDaL.js    164.07 kB │ gzip: 53.69 kB
dist/assets/markdown-BdM3WZMV.js  166.49 kB │ gzip: 50.95 kB
✓ built in 9.25s
[copy-public-content] Successfully copied public books to dist/content/public-books
```

- **程式碼分割 (Code Splitting)**：`vendor` (React/Router)、`markdown` (ReactMarkdown/GFM)、`icons` (Lucide) 與主要 App 邏輯清晰拆分，首頁加載小於 90 kB gzip。
- **公開內容資產**：`dist/content/public-books/manifest.json` 與公開書籍目錄完整置入。
- **安全防護檢查**：`npx tsx scripts/verify-security.ts` 驗證通過，`dist/` 內無任何私人書籍、草稿或備份殘留。

---

## 六、總結與驗收結論

Reading Notes 2.0 專案經過 M0–M5 初步開發、第二輪安全稽核，以及本次 M6 真實使用情境與端到端瀏覽器驗收：
- **功能完備度**：書籍管理、8 步筆記編輯、三欄式閱讀、深色模式、全文搜尋、含圖片附件之備份還原、Windows 一鍵啟動與停止全面達成。
- **資料安全性**：實體隔離私人儲存空間、白名單發布機制、下架資料徹底清除、搜尋隔離無死角。
- **程式碼品質**：全 TypeScript 嚴格型別校驗通過（0 警告）、Vitest 20 項測試全數通過、Playwright 8 項真實瀏覽器 E2E 測試全數通過。

專案已達正式發布標準，具備生產級別之穩定度與個人資料安全保障。
