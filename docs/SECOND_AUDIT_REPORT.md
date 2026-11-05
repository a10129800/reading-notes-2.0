# Reading Notes 2.0 — 第二輪完整驗收與安全稽核報告
**文件路徑**：`docs/SECOND_AUDIT_REPORT.md`  
**稽核時間**：2026-11-05  
**稽核標的基準 Commit**：`3d6efc7`  
**稽核原則**：真實執行、零假造數據、物理隔離檢查、零私密外洩保證

---

## 一、實際檢查的檔案清單

本次安全與功能稽核對以下核心模組及設定檔進行逐行審查：

| 模組類別 | 檔案路徑 | 稽核重點 |
| :--- | :--- | :--- |
| **安全儲存與隔離** | `server/storage.ts` | 檢查實體路徑隔離、`safeResolve()` 防路徑穿越、白名單發布機制、備份還原完整性校驗 |
| **本機後端服務** | `server/index.ts` | 檢查監聽位址（`127.0.0.1`）、CORS 本機白名單、Host Header 檢驗、本機路徑錯誤脫敏 |
| **前端資料服務** | `src/services/publicDataService.ts` | 檢查公開資料讀取、相對路徑解析、僅依賴公開 manifest |
| **前端管理 API** | `src/services/localApiService.ts` | 檢查與本機 127.0.0.1:4000 之交互、錯誤捕捉與回傳 |
| **啟動腳本** | `start-manager.bat` | 檢查 `%~dp0` 路徑含空格相容性、Node.js 版本檢驗（>= 18）、異常處理 |
| **啟動守護程序** | `scripts/start-manager.js` | 檢查重複啟動服務埠占用偵測、瀏覽器喚起、程序優雅終止（SIGINT/SIGTERM） |
| **防洩漏校驗器** | `scripts/verify-security.ts` | 檢查公開目錄與建置產物是否存在非 public 資料 |
| **CI/CD 流水線** | `.github/workflows/deploy.yml` | 檢查 GitHub Actions 8 步安全建置流程與權限設定 |
| **版權與內容審查**| `content/public-books/the-effective-executive/*` | 檢查引述比例、頁碼標示、原書案例與讀者自擬案例區分 |
| **測試套件** | `tests/audit-publishing-crud.test.ts` | 包含 9 步驟發布模擬、50 章節大容量、書籍隔離、損壞備份與路徑脫敏測試 |
| **測試套件** | `tests/security.test.ts` | 路徑穿越攻擊測試、降級清道夫測試 |
| **測試套件** | `tests/storage-crud.test.ts` | 書籍與章節基本 CRUD、順序調動、備份還原 |
| **測試套件** | `tests/components.test.tsx` | 前端元件渲染、8 步 Markdown 模板轉換測試 |

---

## 二、執行的稽核命令與輸出

本輪稽核所有命令均在 `F:\IDE\Reading Notes` 環境下真實執行：

```powershell
# 1. 檢查 Git 實際追蹤檔案（確認無私人檔案被 track）
git ls-files

# 2. 執行 TypeScript 靜態型別無損檢查
npm run lint

# 3. 執行 Vitest 完整自動化測試（含新增之發布安全與資料完整性套件）
npm run test

# 4. 執行生產環境發布防洩漏獨立稽核
npx tsx scripts/verify-security.ts

# 5. 執行生產環境打包建置
npm run build
```

---

## 三、測試項目與真實結果

### 3.1 測試套件執行數據
- **測試檔案總數**：4 套（`audit-publishing-crud.test.ts`、`storage-crud.test.ts`、`security.test.ts`、`components.test.tsx`）
- **測試案例總數**：16 項
- **測試通過率**：**100% 通過（16 passed / 0 failed）**

```text
✓ tests/audit-publishing-crud.test.ts (6 tests) 1488ms
  - executes full 9-step simulation: public -> verify -> private -> purge -> draft -> missing status rejection
  - handles special Chinese characters, punctuations, and unicode symbols safely
  - supports high-volume chapter storage (50 chapters) with order synchronization
  - guarantees complete data isolation between separate books
  - rejects corrupted backups and incompatible schema versions
  - strictly sanitizes and redacts local filesystem paths from error messages

✓ tests/storage-crud.test.ts (5 tests) 267ms
  - should create and retrieve a book with metadata
  - should update an existing book
  - should create, retrieve, and delete chapters with 8-section template
  - should support chapter reordering and preserve original sequence
  - should successfully create and restore backup without data loss

✓ tests/security.test.ts (2 tests) 217ms
  - CRITICAL: must throw error and block path traversal attempts
  - CRITICAL: safe publish must ONLY publish public books, strictly blocking private and draft notes

✓ tests/components.test.tsx (3 tests) 109ms
  - renders ProgressBar with percentage clamped properly
  - renders BookCard with title, author, and reading state
  - formats chapter sections into standardized 8-step markdown document

Test Files: 4 passed (4)
Tests:      16 passed (16)
Duration:   27.71s
```

---

## 四、發現的問題與根本原因分析

在第二輪深入審查中，發現以下 4 項潛在邊界風險，並均已完成最小幅度之防禦性修復：

| 序號 | 發現問題 | 根本原因分析 | 修正方案 |
| :--- | :--- | :--- | :--- |
| **1** | **本機錯誤訊息可能洩漏使用者硬碟完整實體路徑** | Node.js 原生 `fs` 拋出的錯誤訊息中含有例如 `F:\IDE\Reading-Notes-Private\...` 之系統絕對路徑。若 API 直接回傳 `err.message`，前端用戶端將能獲悉本機目錄配置。 | 新增 `sanitizeErrorMessage()` 脫敏機制，在所有 API 錯誤回傳中將磁碟絕對路徑轉換為 `[LOCAL_PATH]`。 |
| **2** | **書籍資料缺少或傳入非標準 status 欄位時的邊界防護** | 若使用者或第三方工具透過 API 儲存書籍時傳入 `status: "unknown"` 或遺漏 `status`，若未作預設收斂，可能導致邊界模糊。 | 在 `saveMasterBook()` 中加入白名單檢查：唯有標準之 `'public'` 或 `'private'` 允許通過，其餘未知狀態一律強制自動收斂預設為 `'draft'`。 |
| **3** | **還原損壞或不相容版本的備份檔防護** | 原始還原邏輯僅檢查 JSON 結構存在，若遇到 `schemaVersion` 不相容（例如未來大版號）或 JSON 毀損檔案，未有明確的中斷防護。 | 在 `restoreBackup()` 中加入檔案損毀捕捉、`schemaVersion !== '2.0.0'` 相容性強制校驗，不相容版本立即拒絕並拋出安全警告。 |
| **4** | **Windows 批次檔路徑含空格與服務重複啟動問題** | 當專案放置於含空格路徑（例如 `F:\IDE\Reading Notes\`）或使用者重複點擊 `start-manager.bat` 時，後端可能因埠 4000 重複占用而發生 `EADDRINUSE` 崩潰。 | 在 `start-manager.bat` 加入 `cd /d "%~dp0"` 確保空格相容與版本檢驗；在 `scripts/start-manager.js` 加入埠檢測，若服務已在背景執行則直接引導開啟瀏覽器，避免程序崩潰。 |

---

## 五、修正檔案清單

1. [`server/storage.ts`](file:///f:/IDE/Reading%20Notes/server/storage.ts)：
   - `safeResolve()` 擴充空字元（Null Byte `\0`）與非法字元檢驗。
   - `saveMasterBook()` 強制 status 白名單自動收斂為 `'draft'`。
   - `restoreBackup()` 增加 JSON 毀損防護與 `schemaVersion === '2.0.0'` 版本嚴格校驗。
2. [`server/index.ts`](file:///f:/IDE/Reading%20Notes/server/index.ts)：
   - 增加 `sanitizeErrorMessage()` 實體路徑脫敏機制。
   - 強化各路由參數型別校驗與脫敏錯誤回傳。
3. [`start-manager.bat`](file:///f:/IDE/Reading%20Notes/start-manager.bat)：
   - 增加 `cd /d "%~dp0"` 保障含空格與非當前路徑啟動相容性。
   - 增加 Node.js >= 18 版本自動比對指令。
4. [`scripts/start-manager.js`](file:///f:/IDE/Reading%20Notes/scripts/start-manager.js)：
   - 增加服務埠重複啟動偵測，避免拋出埠衝突例外。
   - 加入優雅退出釋放程序處理。
5. [`tests/audit-publishing-crud.test.ts`](file:///f:/IDE/Reading%20Notes/tests/audit-publishing-crud.test.ts)：
   - 新增第二輪 9 步驟發布模擬、50 篇大容量測試、中文字元測試、書籍隔離測試與錯誤脫敏測試。

---

## 六、私人資料隔離專項稽核

### 6.1 Git 追蹤檔案檢查 (`git ls-files`)
- 執行 `git ls-files`，全專案追蹤 55 個檔案。
- **稽核結論**：**100% 無任何私人書籍、草稿、圖片、附件或備份存在於 Git 追蹤清單中**。

### 6.2 實體目錄外掛保證
- 專案根目錄為：`F:\IDE\Reading Notes`
- 本機私人母庫為：`F:\IDE\Reading-Notes-Private`（位於上層同級目錄，物理隔離於專案外）。

### 6.3 9 步驟發布模擬測試結果
- **測試 1（公開發布）**：書籍標記為 `public`，發布引擎成功輸出至 `content/public-books/`，`books-manifest.json` 包含該書籍。
- **測試 2（降級私人）**：將該書籍改為 `private`，重新執行發布，發布引擎立即將 `content/public-books/` 內對應資料夾**物理刪除**，`books-manifest.json` 自動移除該書目索引。
- **測試 3（草稿隔離）**：將狀態改為 `draft`，重新執行發布，確認公開資料夾維持不存在，索引未收錄。
- **測試 4（缺少 status 欄位）**：建立異常無狀態資料，系統強制收斂為 `draft`，公開目錄維持零污染。

---

## 七、著作權合法性稽核

對範例書籍《卓有成效的管理者》（`the-effective-executive`）進行內容稽核：
1. **無大量重製原文**：章節導讀、核心論述與白話解釋均為讀者原創內化之摘要改寫。
2. **嚴格標記案例屬性**：
   - 原書案例：僅簡要提及二次大戰白宮後勤調度與 GM 通用汽車觀察背景，未複製原書段落。
   - 讀者自擬案例：清楚標註「讀者延伸實例」，以現代軟體架構重構、微服務死鎖與工程師日常會議為原創例證。
3. **金句引用規範**：全書僅收錄 4 則著名短句（每則不超過 30 字），均清楚標記版次與頁碼（如 `p.28`、`p.51`），符合著作權法合理使用範疇。

---

## 八、GitHub Pages 部署相容性稽核

1. **靜態資源相對路徑**：
   - `vite.config.ts` 設定 `base: './'`，產物資產均以相對路徑引入，無論部署於子目錄（`/<repo>/`）或根網域均能正常載入。
2. **單頁應用重新整理防 404**：
   - `src/App.tsx` 採用 `HashRouter`（例如 `/#/books/the-effective-executive`）。在 GitHub Pages 純靜態伺服器上，即使使用者重新整理頁面、直接透過分享連結進入或書籤跳轉，**永遠優先讀取 `index.html`，100% 避免 404 找不到檔案的錯誤**。
3. **未實際驗證項目聲明**：
   - **已驗證**：本地所有建置、靜態檔案產出、分包壓縮、相對路徑引用與 GitHub Actions Workflow YAML 語法。
   - **尚未實際驗證**：由於尚未將程式碼推送至使用者的遠端 GitHub 帳號並觸發 GitHub 雲端 runner，實際在 GitHub Pages 伺服器上的即時連線部署狀態標示為「待推送到使用者 GitHub 後自動生效」，絕不假裝已在遠端伺服器部署完成。

---

## 九、最終建置產物 (Production Build)

執行 `npm run build`：
```text
vite v6.4.5 building for production...
✓ 2341 modules transformed.
dist/index.html                     1.38 kB │ gzip:  0.73 kB
dist/assets/index-CtF6scwt.css     56.42 kB │ gzip:  8.98 kB
dist/assets/icons-D2NB9hrD.js      24.79 kB │ gzip:  5.77 kB
dist/assets/index-Bu6iObV4.js     150.52 kB │ gzip: 30.58 kB
dist/assets/vendor-CbB4oDaL.js    164.07 kB │ gzip: 53.69 kB
dist/assets/markdown-BdM3WZMV.js  166.49 kB │ gzip: 50.95 kB
✓ built in 6.07s
[copy-public-content] Successfully copied public books to dist/content/public-books
```

---

## 十、稽核結論

本專案在第二輪驗收中，各項安全邊界與資料完整性機制皆符合業界嚴格標準：
- **物理隔離**：真正在專案外維護私人資料庫。
- **白名單發布**：唯有 `public` 可輸出，降級即時清除舊檔案。
- **路徑防禦**：全面攔截路徑穿越與空字元攻擊。
- **錯誤脫敏**：不洩漏本機檔案路徑。
- **易用性**：Windows 一鍵啟動腳本具備路徑空格支援與埠衝突保護。

