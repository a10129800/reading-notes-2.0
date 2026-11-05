@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0"

echo ===================================================================
echo   Reading Notes 2.0 - 個人數位閱讀筆記與知識分享平台
echo   正在啟動本機管理器 (Local Manager Studio)...
echo ===================================================================
echo [環境檢查] 工作目錄: %~dp0
echo.

:: 1. Check Node.js existence
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [錯誤] 找不到 Node.js！
    echo 請先前往官方網站安裝 Node.js 18 或以上版本: https://nodejs.org
    echo 安裝完成後請重新執行此程式。
    pause
    exit /b 1
)

:: 2. Check Node.js version >= 18
node -e "const v = parseInt(process.versions.node.split('.')[0]); if (v < 18) { process.exit(1); }" >nul 2>nul
if %errorlevel% neq 0 (
    echo [警告] 偵測到您的 Node.js 版本過舊。
    echo 本系統建議使用 Node.js 18 或 20 以上版本。
    echo.
)

:: 3. Check dependencies
if not exist "node_modules\" (
    echo [提示] 首次執行，正在自動安裝依賴套件 (此步驟僅需執行一次)...
    call npm install
    if %errorlevel% neq 0 (
        echo [錯誤] 依賴安裝失敗，請確認網路連線是否正常後重試。
        pause
        exit /b 1
    )
)

echo [啟動] 正在啟動本機管理後端 (127.0.0.1:4000) 與前端介面 (Port 3000)...
echo [提示] 服務啟動完成後將自動開啟預設瀏覽器進入工作台。
echo [提示] 按下 Ctrl + C 即可隨時安全關閉服務。
echo ===================================================================
echo.

node scripts/start-manager.js

pause

