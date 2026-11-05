# Reading Notes 2.0
> **個人數位閱讀筆記與知識分享平台 (Personal Digital Reading & Knowledge Sharing Platform)**  
> Modern Editorial + Academic Knowledge Library

[![GitHub Pages Deployment](https://github.com/your-username/reading-notes/actions/workflows/deploy.yml/badge.svg)](https://github.com/your-username/reading-notes/actions/workflows/deploy.yml)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF.svg)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 一、專案核心定位

**Reading Notes 2.0** 不是一般的部落格，也不是單純的 Markdown 閱讀器，而是一套為長期嚴肅閱讀者打造的**個人閱讀管理、知識內化整理與公開安全分享系統**。

### 🌟 核心特色

1. **三態權限管理系統 (Public / Private / Draft)**
   - **Public（公開）**：經審核透過白名單發布機制部署至 GitHub Pages，分享給所有網路使用者。
   - **Private（私人）**：僅儲存於使用者本機電腦，**物理隔離**於公開專案目錄之外，絕不上傳至公開 GitHub 倉庫或網路搜尋索引。
   - **Draft（草稿）**：未完成的篇章，僅在本機工作台瀏覽與編輯。
2. **標準 8 步學術結構化筆記模板**
   - 嚴格保留原書篇章架構與順序，落實八大結構化維度：
     1. **01. 章節導讀**：本章背景、學習目標、核心探討問題。
     2. **02. 核心摘要**：作者主要論述、篇章摘要、關鍵觀點。
     3. **03. 專業知識**：正式定義、專業術語、理論學說、出處文獻依據。
     4. **04. 白話解釋**：用平易近人的語言重構概念，搭配生活化譬喻。
     5. **05. 案例分析**：**嚴格標記界定「原書經典案例」與「讀者自行延伸案例」**。
     6. **06. 重點整理**：條列重點、比較表格（Markdown）、流程圖結構。
     7. **07. 個人心得**：客觀反思、認同之處、不認同/質疑點、延伸探討。
     8. **08. 本章總結**：核心知識結晶、結論、下一步實踐思考。
3. **零付費依賴與資料自主權**
   - 100% 免費、開源技術堆疊。
   - 不依賴任何付費 API、雲端資料庫或訂閱制平台。
   - 純本機 JSON/Markdown 儲存，支援完整時間戳記備份與還原。
4. **出版物質感 UI / UX (Modern Editorial)**
   - 米白暖紙底色 (`#FAF8F5`)、深墨字色 (`#1C1917`)、古銅金點綴 (`#B48234`)、深藍沈穩標誌。
   - 支援完整**深色模式**、**三段字級切換**、**手機/桌面響應式設計**、**列印排版優化**。
   - 章節三欄式閱讀：左側目錄導航、中央 8 步文章、右側快速錨點與本章金句。

---

## 二、技術架構

| 系統模組 | 採用技術 |
| :--- | :--- |
| **公開網站 (Public Reader)** | React 18, TypeScript, Vite 6, Tailwind CSS, React Router (HashRouter), React Markdown (GFM) |
| **本機管理器 (Local Manager)** | React + TypeScript 管理介面, Node.js + Express 後端 (僅監聽 `127.0.0.1:4000`) |
| **資料儲存 (Data Storage)** | 物理隔離式檔案儲存 (`Reading-Notes-Private/`), JSON 中繼資料, Markdown 篇章筆記 |
| **自動化部署 (CI/CD)** | GitHub Actions + GitHub Pages, 白名單防洩漏校驗腳本 |

---

## 三、快速開始

### 3.1 系統需求
- [Node.js](https://nodejs.org/) v20 或以上版本（支援 Windows 10/11、macOS、Linux）。
- Git 2.x

### 3.2 下載專案與安裝依賴
```bash
git clone https://github.com/your-username/reading-notes.git
cd "Reading Notes"
npm install
```

### 3.3 Windows 一鍵啟動本機管理器
在專案根目錄，**按兩下執行 `start-manager.bat`**。
系統將會：
1. 自動檢查並安裝環境依賴。
2. 啟動後端 Express 管理服務（嚴格監聽 `127.0.0.1:4000`）。
3. 啟動前端開發介面（`http://127.0.0.1:3000`）。
4. 自動開啟預設瀏覽器進入「本機閱讀管理工作台」(`http://localhost:3000/#/manager`)。

*(macOS/Linux 使用者可執行 `npm run manager`)*

---

## 四、本機與私人資料隔離架構

為了確保私人筆記百分之百安全，專案採行**物理路徑分離**：

```
f:\IDE\
├── Reading-Notes/                # 公開 Git 倉庫 (此專案)
│   ├── .github/workflows/       # GitHub Pages 自動部署腳本
│   ├── content/
│   │   └── public-books/        # 僅存放明確標記為 public 的書籍輸出
│   ├── public/                  # 靜態資源 (Favicon 等)
│   ├── scripts/                 # 安全發布與防洩漏檢查腳本
│   ├── server/                  # 本機後端服務 (127.0.0.1)
│   ├── src/                     # 前端原始碼 (Reader & Manager)
│   ├── tests/                   # 單元測試與安全防護測試
│   └── start-manager.bat        # Windows 一鍵啟動器
│
└── Reading-Notes-Private/        # Sibling 目錄 (位於 Git 倉庫之外！)
    ├── books/                   # 包含 Public / Private / Draft 完整母本
    ├── drafts/                  # 未完草稿
    ├── images/                  # 本機私密圖片
    ├── attachments/             # 附件
    └── backups/                 # 時間戳記完整備份包 (.json)
```

> [!IMPORTANT]
> **防洩漏三重保障**：
> 1. **實體路徑隔離**：私人母本目錄位於公開倉庫之外。
> 2. **白名單發布機制**：發布腳本嚴格過濾 `status === "public"`，其餘狀態一律阻斷。
> 3. **降級自動清道夫**：公開書籍一旦被改為 `private`，下一次發布時會自動將其從公開目錄與搜尋索引中抹除。

---

## 五、常用指令 (Scripts)

| 指令 | 說明 |
| :--- | :--- |
| `npm run dev` | 啟動前端 Vite 開發預覽伺服器 (Port 3000) |
| `npm run server` | 啟動本機管理後端服務 (Port 4000, 127.0.0.1) |
| `npm run manager` | 同步啟動前後端並自動開啟本機工作台 |
| `npm run publish:public` | 執行安全白名單發布，將 Public 書籍同步至 `content/public-books/` |
| `npm run test` | 執行 Vitest 完整單元測試與安全測試套件 |
| `npm run test:security` | 執行專屬路徑穿越攻擊與防洩漏安全性測試 |
| `npm run lint` | 執行 TypeScript 靜態型別無損檢查 (`tsc --noEmit`) |
| `npm run build` | 建置 GitHub Pages 靜態生產環境產物 (`dist/`) |

---

## 六、GitHub Pages 部署教學

1. **建立 GitHub Repository**：
   在 GitHub 上建立一個新的 Public Repository（例如 `reading-notes`）。
2. **推動程式碼**：
   ```bash
   git add .
   git commit -m "feat: complete Reading Notes 2.0 implementation"
   git branch -M main
   git remote add origin https://github.com/<你的帳號>/reading-notes.git
   git push -u origin main
   ```
3. **啟用 GitHub Pages**：
   - 進入 GitHub 倉庫的 **Settings** -> **Pages**。
   - 在 **Build and deployment** 下方的 **Source** 選擇 **GitHub Actions**。
4. **自動化發布**：
   每次推送 `main` 分支時，GitHub Actions 會自動執行：
   - 白名單權限檢查
   - TypeScript 型別檢查
   - 10 項單元與安全防護測試
   - 產物零洩漏覆核
   - 部署至 `https://<你的帳號>.github.io/reading-notes/`。

---

## 七、著作權與學術筆記原則

閱讀筆記整理堅持遵循學術引用倫理：
- 作者原始觀點與讀者心得嚴格標註分開。
- 不大量摘抄原文，以深度內化為核心。
- 原書案例與自行舉例清楚界定標記。
- 專業術語與定義盡可能核對來源與頁碼。

---

## 八、授權條款

本專案採用 [MIT License](LICENSE) 授權釋出。

