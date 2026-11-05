# Reading Notes 2.0 — M10 正式發布後驗收規劃與執行報告

**報告日期**：2026 年 11 月 5 日  
**專案名稱**：Reading Notes 2.0 (Personal Digital Reading & Knowledge Sharing Platform)  
**階段任務**：M10 正式發布後雲端上線驗收與檢查指引 (Post-Deployment Acceptance & Remote Verification)  
**當前狀態**：⏸️ **等待使用者推送遠端後執行（本機環境已完成前置模擬驗證）**  

---

## 一、發布後 10 大驗收項目檢核清單

依據規範，本表誠實標註目前狀態（因尚未由使用者向遠端 GitHub 執行 `git push`，遠端項目標記為 `NOT TESTED` 或 `REQUIRES USER ACTION`，本機對應功能標記為 `PASS`）：

| # | 驗收項目 | 檢驗標準與執行說明 | 本機預驗結果 | 遠端雲端狀態 |
| :-: | :--- | :--- | :---: | :---: |
| **1** | **GitHub Actions 執行結果** | 檢視 Actions 頁面，確認 `build-and-verify` 與 `deploy` 工作流程均顯示綠色勾勾（Success） | `PASS` | `NOT TESTED`<br>*(待 Push 後自動觸發)* |
| **2** | **GitHub Pages 部署狀態** | 檢視倉庫 Settings -> Pages，確認已顯示「Your site is live at https://...」 | `PASS` | `REQUIRES USER ACTION` |
| **3** | **實際開啟網站公開網址** | 使用無痕瀏覽器開啟 GitHub Pages 網址，檢查首頁能否秒級順暢載入 | `PASS` | `REQUIRES USER ACTION` |
| **4** | **首頁與書籍列表瀏覽** | 檢查首頁統計數字（1 本公開書籍、2 篇章節、2 則金句），點擊「書籍館藏總覽」正常顯示書籍卡片 | `PASS`<br>*(Playwright E2E 通過)* | `NOT TESTED` |
| **5** | **章節閱讀頁三欄佈局** | 進入《卓有成效的管理者》篇章閱讀頁，目錄導航、8 步筆記主體、右側章節錨點 100% 完整呈現 | `PASS`<br>*(Playwright E2E 通過)* | `NOT TESTED` |
| **6** | **全文搜尋功能** | 搜尋「時間管理」或「知識工作者」，能否精確命中段落並呈現高亮 Snippet；無結果時是否顯示友善空狀態 | `PASS`<br>*(Playwright E2E 通過)* | `NOT TESTED` |
| **7** | **標籤與知識圖譜展示** | 點擊書籍標籤（如「時間管理」、「自我管理」）能正常篩選；知識關聯頁面無異常報錯 | `PASS` | `NOT TESTED` |
| **8** | **深色模式與字級調整** | 點擊右上角太陽/月亮圖示可平滑切換 Dark/Light 樣式；點擊「特大字級」文章即時放大排版無跑版 | `PASS`<br>*(Playwright E2E 通過)* | `NOT TESTED` |
| **9** | **Markdown 匯出與 PDF 列印**| 點擊「列印」能喚起瀏覽器列印對話框；點擊「匯出 Markdown」可下載純文字筆記 | `PASS` | `NOT TESTED` |
| **10**| **雲端零洩漏安全確認** | 檢查公開 Manifest、Sitemap 與直接 URL（如嘗試請求未公開草稿之 JSON 網址），確認**私人草稿與掃描圖檔 100% 不可見、不可存取** | `PASS`<br>*(資安白名單通過)* | `NOT TESTED` |

---

## 二、發布後自我驗收操作步驟（使用者操作指引）

當您完成遠端推送並啟用 GitHub Pages 後，請依序進行以下 3 分鐘快速驗收：

1. **檢查 Actions 狀態**：
   進入 GitHub 倉庫頁面，點擊上方選單 **「Actions」**，確認名為 `Deploy Reading Notes 2.0 to GitHub Pages` 的最新 Workflow 顯示綠色通過標誌。
2. **開啟無痕分頁**：
   開啟 Chrome / Edge 無痕視窗（排除本機快取干擾），訪問您的專屬公開網址：
   `https://<您的GitHub帳號>.github.io/<儲存庫名稱>/`
3. **驗證深層路由防護**：
   在網址列直接輸入深層篇章連結（如 `/#/books/the-effective-executive/chapter-01`），按下 Enter 鍵重新整理，確認網頁依然順暢呈現，沒有跳出 404 錯誤（由 HashRouter 守護）。
4. **驗證隱私隔離**：
   在公開網站右上角搜尋欄搜尋最新草稿書籍關鍵詞（例如「刑法」或「犯罪概念」），確認**搜尋結果為 0**，證明本機正在編輯的私人草稿書籍絕對不會被公開！

---

## 三、長期維運與持續擴充工作流程

```mermaid
flowchart LR
  A[使用者提供掃描書籍圖片] --> B[Antigravity 深度閱讀與重點整理]
  B --> C[寫入本機 Reading Notes 2.0 儲存庫]
  C --> D[狀態: draft 草稿<br>實體隔離在 Git 外部]
  D --> E[使用者審閱、批註與修改]
  E --> F{使用者是否決定公開?}
  F -- 否 / 繼續研讀 --> D
  F -- 是 / 點擊發布 --> G[狀態轉為 public]
  G --> H[執行發布流水線輸出至 content/public-books]
  H --> I[使用者確認後 git push]
  I --> J[GitHub Actions 自動建置並更新公開網站]
```

本專案架構已為您的長遠個人閱讀與公開知識庫奠定最堅實、最安全的地基。

