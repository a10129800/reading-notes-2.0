import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PID_DIR = path.resolve(__dirname, '..', 'pids');
const PID_FILE = path.join(PID_DIR, 'manager.json');

console.log('===========================================================');
console.log(' Reading Notes 2.0 - Starting Local Management Studio');
console.log('===========================================================');

// Helper to open browser
function openBrowser(url) {
  const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(startCmd, [url], { shell: true });
}

// Check if server is already running (e.g. repeated launch)
function checkPortInUse(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(600, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function start() {
  const backendAlreadyLive = await checkPortInUse(4000);

  let serverProcess = null;
  let viteProcess = null;

  if (backendAlreadyLive) {
    console.log('[提示] 偵測到本機後端服務已在背景執行中 (127.0.0.1:4000)。');
    console.log('>>> 正在直接為您開啟工作台瀏覽器: http://localhost:3000/#/manager <<<\n');
    openBrowser('http://localhost:3000/#/manager');
    return;
  }

  // 1. Spawn Backend Express Server
  serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: '4000', HOST: '127.0.0.1' },
  });

  // 2. Spawn Vite Frontend with Manager Studio enabled
  viteProcess = spawn('npx', ['vite', '--port', '3000', '--host', '127.0.0.1'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VITE_ENABLE_MANAGER: 'true', VITE_APP_MODE: 'manager' },
  });

  // Write PID metadata for safe shutdown verification
  try {
    if (!fs.existsSync(PID_DIR)) fs.mkdirSync(PID_DIR, { recursive: true });
    fs.writeFileSync(PID_FILE, JSON.stringify({
      managerPid: process.pid,
      serverPid: serverProcess.pid,
      vitePid: viteProcess.pid,
      startedAt: new Date().toISOString(),
      projectDir: path.resolve(__dirname, '..')
    }, null, 2));
  } catch {}

  // Wait for frontend and backend to become ready, then open browser
  let browserOpened = false;
  const checkInterval = setInterval(() => {
    http.get('http://127.0.0.1:4000/api/health', (res) => {
      if (res.statusCode === 200 && !browserOpened) {
        browserOpened = true;
        clearInterval(checkInterval);
        console.log('\n>>> 本機服務已啟動！正在為您開啟瀏覽器: http://localhost:3000/#/manager <<<\n');
        setTimeout(() => {
          openBrowser('http://localhost:3000/#/manager');
        }, 800);
      }
    }).on('error', () => {
      // Keep waiting
    });
  }, 600);

  const cleanExit = () => {
    clearInterval(checkInterval);
    try {
      if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    } catch {}
    if (serverProcess) serverProcess.kill();
    if (viteProcess) viteProcess.kill();
    process.exit(0);
  };

  process.on('SIGINT', cleanExit);
  process.on('SIGTERM', cleanExit);
  process.on('exit', cleanExit);
}

start().catch(err => {
  console.error('[啟動錯誤]', err);
  process.exit(1);
});

