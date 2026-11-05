import { spawn } from 'child_process';
import http from 'http';

console.log('===========================================================');
console.log(' Reading Notes 2.0 - Starting Local Management Studio');
console.log('===========================================================');

// 1. Spawn Backend Express Server
const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '4000', HOST: '127.0.0.1' },
});

// 2. Spawn Vite Frontend
const viteProcess = spawn('npx', ['vite', '--port', '3000'], {
  stdio: 'inherit',
  shell: true,
});

// Helper to open browser
function openBrowser(url) {
  const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(startCmd, [url], { shell: true });
}

// Wait for frontend and backend to become ready, then open browser
let browserOpened = false;
const checkInterval = setInterval(() => {
  http.get('http://127.0.0.1:4000/api/health', (res) => {
    if (res.statusCode === 200 && !browserOpened) {
      browserOpened = true;
      clearInterval(checkInterval);
      console.log('\n>>> Servers are ready! Opening Local Manager in browser: http://localhost:3000/#/manager <<<\n');
      setTimeout(() => {
        openBrowser('http://localhost:3000/#/manager');
      }, 1000);
    }
  }).on('error', () => {
    // Keep waiting
  });
}, 800);

process.on('SIGINT', () => {
  serverProcess.kill();
  viteProcess.kill();
  process.exit(0);
});
