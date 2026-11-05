@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0"

echo ===================================================================
echo   Reading Notes 2.0 - 安全關閉本機管理器 (Stop Manager)
echo ===================================================================
echo.

where node >nul 2>nul
if %errorlevel% equ 0 (
    node scripts/stop-manager.js
) else (
    echo [提示] 找不到 Node.js，改用 PowerShell 執行安全檢驗...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$p4 = (Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue).OwningProcess; " ^
        "$p3 = (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).OwningProcess; " ^
        "if ($p4) { $c = (Get-CimInstance Win32_Process -Filter \"ProcessId = $p4\").CommandLine; if ($c -match 'Reading Notes' -or $c -match 'server/index.ts') { Stop-Process -Id $p4 -Force; Write-Host '[停止] Port 4000 Reading Notes 程序已終止' } else { Write-Host \"[警告] Port 4000 屬於外部程序 ($p4)，非 Reading Notes，跳過不終止。\" } } " ^
        "if ($p3) { $c = (Get-CimInstance Win32_Process -Filter \"ProcessId = $p3\").CommandLine; if ($c -match 'Reading Notes' -or $c -match 'vite') { Stop-Process -Id $p3 -Force; Write-Host '[停止] Port 3000 Reading Notes 前端已終止' } else { Write-Host \"[警告] Port 3000 屬於外部程序 ($p3)，非 Reading Notes，跳過不終止。\" } }"
)

pause
