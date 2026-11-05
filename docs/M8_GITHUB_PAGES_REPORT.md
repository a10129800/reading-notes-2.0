# Reading Notes 2.0 — M8 GitHub Pages 部署架構報告

**報告日期**：2026 年 11 月 5 日  
**專案名稱**：Reading Notes 2.0 (Personal Digital Reading & Knowledge Sharing Platform)  
**階段任務**：M8 GitHub Pages 部署架構設計與驗證 (Deployment Architecture & CI/CD Pipeline)  
**當前版本**：2.0.0  

---

## 一、架構檢查與規範落實清單

本階段依據專案最高原則，全面檢視並強化現有部署設定，落實結果如下：

| # | 部署架構要點 | 實作機制與設定 | 評定狀態 |
| :-: | :--- | :--- | :---: |
| **1** | **使用 GitHub Actions 建置** | 透過 `.github/workflows/deploy.yml` 於 `ubuntu-latest` 執行標準化 CI 建置環境 | `PASS` |
| **2** | **使用現有 npm build 指令** | 於 Step 7 執行專案原生 `npm run build` (`tsc && vite build`)，無自訂私有打包工具 | `PASS` |
| **3** | **上傳正式建置產物** | 使用官方 `actions/upload-pages-artifact@v3`，明確限定 `path: './dist'`，僅上傳靜態產物 | `PASS` |
| **4** | **使用官方 Deploy Action** | 使用官方推薦之 `actions/deploy-pages@v4` 執行安全無密碼 OIDC 部署 | `PASS` |
| **5** | **最小必要權限原則** | 嚴格限定 `permissions: contents: read, pages: write, id-token: write`，杜絕倉庫寫入或提權風險 | `PASS` |
| **6** | **僅允許預設分支正式部署** | 部署 Job 設定 `if: github.event_name != 'pull_request'`，僅在 `master` / `main` 推送或手動觸發時部署 | `PASS` |
| **7** | **Pull Request 只測試不部署** | PR 觸發時完整執行型別檢查、單元測試、建置與雙重資安驗證，但**完全跳過**上傳產物與 Pages 部署 | `PASS` |
| **8** | **部署失敗安全中斷機制** | 採循序閘門設計：Pre-check -> Lint -> Test -> Build -> Post-check -> Deploy。任何前置步驟失敗，立即終止流程，絕不上線損壞版本 | `PASS` |
| **9** | **GitHub Pages 相對路徑設定** | 在 `vite.config.ts` 設定 `base: './'`，相容於自訂網域或使用者子目錄（如 `username.github.io/repo/`） | `PASS` |
| **10**| **保留現有 HashRouter 路由** | 前端採用 `HashRouter`（`/#/...`），徹底避免 GitHub Pages 靜態伺服器在頁面重新整理時拋出 404 錯誤 | `PASS` |

---

## 二、CI/CD 自動化工作流架構圖

```mermaid
flowchart TD
  A[觸發事件: Push / PR / 手動觸發] --> B[1. Checkout Repository]
  B --> C[2. Setup Node.js 22 & npm cache]
  C --> D[3. npm ci 乾淨依賴安裝]
  D --> E[4. 資安白名單前置審核 verify-security.ts]
  E --> F[5. TypeScript 型別檢查 npm run lint]
  F --> G[6. 單元、整合與容量測試 npm run test]
  G --> H[7. 公開靜態網站建置 npm run build]
  H --> I[8. 產物二次零洩漏後置審查 verify-security.ts]
  I --> J{是否為 Pull Request?}
  J -- 是 (PR 驗證模式) --> K[✅ CI 測試完成 (不發布、不上線)]
  J -- 否 (正式分支部署) --> L[9. Configure GitHub Pages]
  L --> M[10. Upload Artifact ./dist]
  M --> N[11. Deploy to GitHub Pages]
  N --> O[🚀 正式公開網站上線]
```

---

## 三、部署設定檔案細部清單

### 1. 工作流配置檔 (`.github/workflows/deploy.yml`)
- **觸發分支**：`master`、`main`（支援 PR 驗證模式與 `workflow_dispatch` 手動派發）。
- **隔離安全**：上傳路徑僅限 `./dist`，外部私人目錄 `Reading-Notes-Private` 實體獨立於倉庫外，無法被 Actions 讀取。
- **雙重驗證閘門**：建置前後兩次呼叫 `verify-security.ts`，確保白名單機制無懈可擊。

### 2. 前端路徑配置 (`vite.config.ts`)
```typescript
export default defineConfig({
  base: './', // 確保靜態資源引用為相對路徑，相容於 GitHub Pages 子路徑
  plugins: [react(), copyPublicContentPlugin()],
  // ...
});
```

### 3. 路由配置 (`src/App.tsx`)
```typescript
// HashRouter 保證 GitHub Pages 在無伺服器端 Rewrite 規則下，重新整理或直接開啟深層連結絕不 404
<HashRouter>
  <Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/books" element={<BookListPage />} />
      <Route path="/books/:bookId" element={<BookDetailPage />} />
      <Route path="/books/:bookId/:chapterId" element={<ChapterReaderPage />} />
      <Route path="/search" element={<SearchPage />} />
      {/* ... */}
    </Route>
  </Routes>
</HashRouter>
```

---

## 四、結論

M8 部署架構已完成最佳化與雙閘門防禦，具備高強韌度、零資料外洩風險與完善的 PR/預設分支分流保護。

