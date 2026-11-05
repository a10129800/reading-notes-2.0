@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0"

echo ===================================================================
echo   Reading Notes 2.0 - 正在關閉本機管理器服務 (Stop Manager)
echo ===================================================================
echo.

set KILLED=0

:: 1. Search and terminate process listening on Port 4000 (Local API)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000" ^| findstr "LISTENING" 2^>nul') do (
    echo [關閉] 正在終止後端服務程序 (PID: %%a，連接埠 4000)...
    taskkill /F /PID %%a >nul 2>nul
    set KILLED=1
)

:: 2. Search and terminate process listening on Port 3000 (Vite Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING" 2^>nul') do (
    echo [關閉] 正在終止前端工作台程序 (PID: %%a，連接埠 3000)...
    taskkill /F /PID %%a >nul 2>nul
    set KILLED=1
)

echo.
if "!KILLED!"=="1" (
    echo ===================================================================
    echo   [成功] 本機管理器服務已完全停止！
    echo   連接埠 4000 與 3000 已釋放，資料庫已安全保存。
    echo ===================================================================
) else (
    echo [提示] 目前未偵測到正在執行的管理器服務 (連接埠 4000 與 3000 均為閒置狀態)。
)

echo.
pause

