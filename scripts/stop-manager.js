import http from 'http';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_DIR = path.resolve(__dirname, '..');
const PID_FILE = path.join(PROJECT_DIR, 'pids', 'manager.json');

console.log('===========================================================');
console.log(' Reading Notes 2.0 - 安全關閉管理器服務 (Safe Stop)');
console.log('===========================================================');

/**
 * Get command line for a PID on Windows
 */
function getProcessCommandLine(pid) {
  try {
    const cmd = `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}').CommandLine"`;
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 3000 });
    return (out || '').trim();
  } catch {
    return '';
  }
}

/**
 * Get PID listening on a specific port
 */
function getPortPid(port) {
  try {
    const cmd = `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).OwningProcess"`;
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 3000 });
    const lines = (out || '').trim().split(/\r?\n/).filter(Boolean);
    if (lines.length > 0) {
      const pid = parseInt(lines[0].trim(), 10);
      return isNaN(pid) ? null : pid;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Verify Reading Notes health endpoint
 */
function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:4000/api/health', (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json && json.status === 'ok' && json.version === '2.0.0');
        } catch {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Safely kill a process by PID on Windows
 */
function killPid(pid) {
  try {
    execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

async function stop() {
  let pidData = null;
  if (fs.existsSync(PID_FILE)) {
    try {
      pidData = JSON.parse(fs.readFileSync(PID_FILE, 'utf8'));
    } catch {}
  }

  let killedAny = false;

  // 1. Check Port 4000 (Backend API)
  const port4000Pid = getPortPid(4000);
  if (port4000Pid) {
    const isHealthOk = await checkHealth();
    const cmdLine = getProcessCommandLine(port4000Pid);
    const matchesReadingNotes =
      cmdLine.includes('Reading Notes') ||
      cmdLine.includes('server/index.ts') ||
      (pidData && pidData.serverPid === port4000Pid);

    if (isHealthOk || matchesReadingNotes) {
      console.log(`[停止] 確認 Port 4000 屬於 Reading Notes 2.0 (PID: ${port4000Pid})，正在終止...`);
      killPid(port4000Pid);
      killedAny = true;
    } else {
      console.log(`[警告] 發現 Port 4000 由外部程序占用 (PID: ${port4000Pid})！`);
      console.log(`       經特徵比對非 Reading Notes 服務。為保障系統安全，絕不強制終止他人程式。`);
      console.log(`       命令列特徵: ${cmdLine.slice(0, 80)}...`);
    }
  }

  // 2. Check Port 3000 (Frontend Vite)
  const port3000Pid = getPortPid(3000);
  if (port3000Pid) {
    const cmdLine = getProcessCommandLine(port3000Pid);
    const matchesViteOrNotes =
      cmdLine.includes('Reading Notes') ||
      (cmdLine.includes('vite') && cmdLine.includes('3000')) ||
      (pidData && pidData.vitePid === port3000Pid);

    if (matchesViteOrNotes) {
      console.log(`[停止] 確認 Port 3000 屬於 Reading Notes 前端 (PID: ${port3000Pid})，正在終止...`);
      killPid(port3000Pid);
      killedAny = true;
    } else {
      console.log(`[警告] 發現 Port 3000 由外部程序占用 (PID: ${port3000Pid})！`);
      console.log(`       經特徵比對非 Reading Notes 服務。為保障系統安全，絕不強制終止他人程式。`);
      console.log(`       命令列特徵: ${cmdLine.slice(0, 80)}...`);
    }
  }

  // 3. Clean up PID file
  if (fs.existsSync(PID_FILE)) {
    try { fs.unlinkSync(PID_FILE); } catch {}
  }

  // 4. Verify release
  await new Promise(r => setTimeout(r, 600));
  const remaining4000 = getPortPid(4000);
  const remaining3000 = getPortPid(3000);

  console.log('\n===========================================================');
  if (killedAny) {
    console.log(' [結果] Reading Notes 2.0 服務已安全終止。');
    if (!remaining4000 && !remaining3000) {
      console.log(' [狀態] 連接埠 4000 與 3000 已完全釋放。');
    }
  } else {
    if (!remaining4000 && !remaining3000) {
      console.log(' [提示] 目前無任何 Reading Notes 管理器服務在背景執行 (連接埠均為閒置)。');
    } else {
      console.log(' [提示] 目前埠位占用者均非 Reading Notes 服務，已全數予以保留。');
    }
  }
  console.log('===========================================================\n');
}

stop().catch(err => {
  console.error('[關閉錯誤]', err);
  process.exit(1);
});

