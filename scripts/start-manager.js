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
function checkPortInUse(port, path = '/api/health', host = '127.0.0.1') {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}${path}`, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(600, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function start() {
  const backendAlreadyLive = await checkPortInUse(4000, '/api/health');
  const frontendAlreadyLive = await checkPortInUse(3000, '/');

  let serverProcess = null;
  let viteProcess = null;

  if (backendAlreadyLive && frontendAlreadyLive) {
    console.log('[提示] 偵測到本機後端服務與前端工作台均已在背景執行中 (4000 & 3000)。');
    console.log('>>> 正在直接為您開啟工作台瀏覽器: http://localhost:3000/#/manager <<<\n');
    openBrowser('http://localhost:3000/#/manager');
    return;
  }

  // 1. Spawn Backend Express Server if not already live
  if (!backendAlreadyLive) {
    serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, PORT: '4000', HOST: '127.0.0.1' },
    });
  } else {
    console.log('[提示] 本機後端服務已在執行中 (127.0.0.1:4000)。');
  }

  // 2. Spawn Vite Frontend with Manager Studio enabled if not already live
  if (!frontendAlreadyLive) {
    viteProcess = spawn('npx', ['vite', '--port', '3000', '--host', '127.0.0.1'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, VITE_ENABLE_MANAGER: 'true', VITE_APP_MODE: 'manager' },
    });
  } else {
    console.log('[提示] 本機前端服務已在執行中 (127.0.0.1:3000)。');
  }

  // Write PID metadata for safe shutdown verification
  try {
    if (!fs.existsSync(PID_DIR)) fs.mkdirSync(PID_DIR, { recursive: true });
    fs.writeFileSync(PID_FILE, JSON.stringify({
      managerPid: process.pid,
      serverPid: serverProcess ? serverProcess.pid : 'already-running',
      vitePid: viteProcess ? viteProcess.pid : 'already-running',
      startedAt: new Date().toISOString(),
      projectDir: path.resolve(__dirname, '..')
    }, null, 2));
  } catch {}

  // Wait for frontend and backend to become ready, then open browser
  let browserOpened = false;
  const checkInterval = setInterval(async () => {
    const isBackOk = await checkPortInUse(4000, '/api/health');
    const isFrontOk = await checkPortInUse(3000, '/');
    if (isBackOk && isFrontOk && !browserOpened) {
      browserOpened = true;
      clearInterval(checkInterval);
      console.log('\n>>> 本機服務已啟動！正在為您開啟瀏覽器: http://localhost:3000/#/manager <<<\n');
      setTimeout(() => {
        openBrowser('http://localhost:3000/#/manager');
      }, 800);
    }
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

