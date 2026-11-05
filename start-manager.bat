@echo off
chcp 65001 >nul
echo ===================================================================
echo   Reading Notes 2.0 - 個人數位閱讀筆記與知識分享平台
echo   正在啟動本機管理器 (Local Manager Studio)...
echo ===================================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [錯誤] 找不到 Node.js！請先安裝 Node.js (https://nodejs.org) 後再執行。
    pause
    exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules\" (
    echo [提示] 首次執行，正在安裝依賴套件...
    call npm install
    if %errorlevel% neq 0 (
        echo [錯誤] 依賴安裝失敗，請檢查網路連線。
        pause
        exit /b 1
    )
)

echo [啟動] 正在啟動本機後端服務 (127.0.0.1:4000) 與前端介面 (3000)...
echo [提示] 服務啟動完成後將自動開啟預設瀏覽器進入工作台。
echo [提示] 按下 Ctrl + C 可關閉服務。
echo.

node scripts/start-manager.js

pause
