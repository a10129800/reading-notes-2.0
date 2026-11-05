# Reading Notes 2.0 - GitHub Pages 部署教學 (Deployment Guide)

本文件說明如何利用 GitHub Actions 將您的公開閱讀筆記自動化部署至 GitHub Pages。

---

## 步驟 1：建立 GitHub 倉庫

1. 前往 [GitHub](https://github.com/) 並登入您的帳號。
2. 點擊右上角 **New repository**。
3. 填寫倉庫名稱，例如 `reading-notes`。
4. 設定為 **Public**（公開倉庫）。
5. **不要**勾選 Initialize with a README（本地已具備完整專案）。
6. 點擊 **Create repository**。

---

## 步驟 2：推送本地專案至 GitHub

開啟終端機（PowerShell 或 Git Bash），切換至專案根目錄執行：

```powershell
# 檢查 Git 狀態
git status

# 暫存所有公開檔案
git add .

# 建立初始提交
git commit -m "feat: complete Reading Notes 2.0 release"

# 設定 main 分支並關聯遠端倉庫
git branch -M main
git remote add origin https://github.com/<你的 GitHub 帳號>/reading-notes.git

# 推送至遠端
git push -u origin main
```

---

## 步驟 3：在 GitHub 啟用 GitHub Pages

1. 在 GitHub 倉庫頁面，點選最上方的 **Settings** 標籤。
2. 在左側選單點選 **Pages**（位於 Code and automation 區塊）。
3. 在 **Build and deployment** 下方的 **Source** 下拉選單中：
   - 選擇 **GitHub Actions**。
4. 儲存設定。

---

## 步驟 4：自動化 CI/CD 流水線執行

每當您執行 `git push origin main` 時，位於 `.github/workflows/deploy.yml` 的自動化流程將依序執行：

1. **Checkout 程式碼**。
2. **安裝 Node.js 與相依套件**。
3. **白名單權限預檢 (`verify-security.ts`)**：嚴格阻斷任何非 public 書籍。
4. **TypeScript 型別無損檢查 (`tsc --noEmit`)**。
5. **執行 10 項單元與安全防護測試 (`vitest run`)**。
6. **建置生產靜態網站 (`vite build`)**。
7. **建置後產物零洩漏覆核**：確認打包出的 `dist/` 僅包含公開資料。
8. **安全發布至 GitHub Pages**。

完成後，您可前往 `https://<你的帳號>.github.io/reading-notes/` 查閱公開發布的閱讀筆記！

