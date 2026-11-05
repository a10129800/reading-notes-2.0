import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import util from 'util';
import { publishWhitelistedBooks, PUBLIC_CONTENT_DIR } from './storage';
import { PublishPipelineResult, DeploymentStatus } from '../src/types';

const execFileAsync = util.promisify(execFile);
const PROJECT_ROOT = process.cwd();

export interface GitExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

/**
 * Execute Vite build in a clean subprocess to avoid JSDOM prototype collisions
 */
export async function runViteBuild(): Promise<{ success: boolean; error?: string }> {
  try {
    const viteBin = path.join(PROJECT_ROOT, 'node_modules/vite/bin/vite.js');
    await execFileAsync(process.execPath, [viteBin, 'build'], {
      cwd: PROJECT_ROOT,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.stderr || err.message };
  }
}

/**
 * Execute git command safely using execFile (no shell interpolation)
 */
export async function runGit(args: string[]): Promise<GitExecResult> {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, {
      cwd: PROJECT_ROOT,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout: stdout.trim(), stderr: stderr.trim(), code: 0 };
  } catch (err: any) {
    return {
      stdout: (err.stdout || '').trim(),
      stderr: (err.stderr || err.message || '').trim(),
      code: err.code || 1,
    };
  }
}

/**
 * Check if remote master has updates that local doesn't have (Remote Ahead / Diverged)
 */
export async function checkRemoteSafety(): Promise<{
  safe: boolean;
  remoteAhead: boolean;
  diverged: boolean;
  message?: string;
}> {
  // 1. Fetch remote master
  const fetchRes = await runGit(['fetch', 'origin', 'master']);
  if (fetchRes.code !== 0) {
    // If remote is unreachable (e.g. offline), warn but allow inspection
    return {
      safe: false,
      remoteAhead: false,
      diverged: false,
      message: `無法連線至 GitHub 遠端倉庫進行衝突檢查：${fetchRes.stderr || '網路超時或存取遭拒'}`,
    };
  }

  // 2. Compare HEAD, origin/master, and merge-base
  const localHeadRes = await runGit(['rev-parse', 'HEAD']);
  const remoteHeadRes = await runGit(['rev-parse', 'origin/master']);
  if (localHeadRes.code !== 0 || remoteHeadRes.code !== 0) {
    return { safe: false, remoteAhead: false, diverged: false, message: '無法取得本機或遠端 Commit Hash' };
  }

  const localHead = localHeadRes.stdout;
  const remoteHead = remoteHeadRes.stdout;

  if (localHead === remoteHead) {
    return { safe: true, remoteAhead: false, diverged: false, message: '本機與遠端 Commit 一致' };
  }

  const mergeBaseRes = await runGit(['merge-base', 'HEAD', 'origin/master']);
  const mergeBase = mergeBaseRes.stdout;

  if (mergeBase === remoteHead) {
    // Local is ahead of remote: completely safe to push!
    return { safe: true, remoteAhead: false, diverged: false, message: '本機領先遠端，可安全推送' };
  }

  if (mergeBase === localHead && remoteHead !== localHead) {
    // Remote is ahead of local: danger of overwrite!
    return {
      safe: false,
      remoteAhead: true,
      diverged: false,
      message: '遠端 origin/master 存在較新的提交，為防覆蓋已中止推送。請先拉取或同步遠端分支。',
    };
  }

  // Branches have diverged
  return {
    safe: false,
    remoteAhead: false,
    diverged: true,
    message: '本機與遠端分支已分叉 (Diverged)，已中止推送以保護資料安全。',
  };
}

/**
 * Deep security verification for content/public-books
 */
export function verifyPublicBooksSecurity(): { valid: boolean; error?: string } {
  const manifestPath = path.join(PUBLIC_CONTENT_DIR, 'books-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return { valid: false, error: 'books-manifest.json 不存在於 content/public-books/' };
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    for (const book of manifest.books || []) {
      if (book.status !== 'public') {
        return { valid: false, error: `安全違規：書籍 "${book.title}" 在公開清單中狀態為 "${book.status}"！僅允許 public！` };
      }
    }

    const entries = fs.readdirSync(PUBLIC_CONTENT_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const bookJsonPath = path.join(PUBLIC_CONTENT_DIR, entry.name, 'book.json');
        if (!fs.existsSync(bookJsonPath)) {
          return { valid: false, error: `安全警告：目錄 "${entry.name}" 缺少 book.json！` };
        }
        const bData = JSON.parse(fs.readFileSync(bookJsonPath, 'utf-8'));
        if (bData.status !== 'public') {
          return { valid: false, error: `安全違規：目錄 "${entry.name}" 內書籍狀態非 public ("${bData.status}")！` };
        }

        // Check for forbidden raw images in public-books directory
        const files = fs.readdirSync(path.join(PUBLIC_CONTENT_DIR, entry.name));
        for (const file of files) {
          const ext = path.extname(file).toLowerCase();
          if (['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.pdf', '.zip'].includes(ext)) {
            return { valid: false, error: `安全違規：公開資料夾中發現原始附件或圖片檔 "${file}"！` };
          }
        }
      }
    }
  } catch (err: any) {
    return { valid: false, error: `公開資料夾驗證解析異常：${err.message}` };
  }

  return { valid: true };
}

/**
 * Precision stage: only content/public-books/
 * Strictly prevents git add . or staging files outside content/public-books
 */
export async function stagePublicBooksOnly(): Promise<{
  stagedFiles: string[];
  hasChanges: boolean;
}> {
  // 1. Stage only content/public-books/
  const addRes = await runGit(['add', 'content/public-books/']);
  if (addRes.code !== 0) {
    throw new Error(`Git Add 失敗：${addRes.stderr}`);
  }

  // 2. Inspect staged files
  const stagedRes = await runGit(['diff', '--cached', '--name-only']);
  const stagedFiles = stagedRes.stdout.split('\n').map(s => s.trim()).filter(Boolean);

  // 3. Safety guard: verify all staged files start with content/public-books/
  for (const file of stagedFiles) {
    const normalized = file.replace(/\\/g, '/');
    if (!normalized.startsWith('content/public-books/')) {
      // Unstage forbidden file immediately
      await runGit(['restore', '--staged', file]);
      throw new Error(`[SECURITY ALERT] 非公開檔案 "${file}" 被意外暫存，已強制還原暫存並終止發布！`);
    }
  }

  return {
    stagedFiles,
    hasChanges: stagedFiles.length > 0,
  };
}

/**
 * Fetch latest GitHub Actions workflow run status
 */
export async function fetchDeploymentStatus(): Promise<DeploymentStatus> {
  const repo = 'a10129800/reading-notes-2.0';
  const url = `https://api.github.com/repos/${repo}/actions/runs?branch=master&per_page=1`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Reading-Notes-Manager/2.0',
        'Accept': 'application/vnd.github.v3+json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        status: 'unknown',
        htmlUrl: `https://github.com/${repo}/actions`,
      };
    }

    const data = await res.json();
    const run = data.workflow_runs?.[0];
    if (!run) {
      return {
        status: 'idle',
        htmlUrl: `https://github.com/${repo}/actions`,
      };
    }

    let mappedStatus: DeploymentStatus['status'] = 'unknown';
    if (run.status === 'queued') mappedStatus = 'queued';
    else if (run.status === 'in_progress') mappedStatus = 'in_progress';
    else if (run.status === 'completed') mappedStatus = 'completed';

    return {
      status: mappedStatus,
      conclusion: run.conclusion,
      runId: run.id,
      commitHash: run.head_sha?.slice(0, 7),
      htmlUrl: run.html_url,
      updatedAt: run.updated_at,
    };
  } catch {
    return {
      status: 'unknown',
      htmlUrl: `https://github.com/${repo}/actions`,
    };
  }
}

/**
 * Execute the complete 6-stage end-to-end publish pipeline
 * Note: Can run in dryRun or commit/push mode.
 */
export async function executePublishPipeline(options: {
  commitAndPush: boolean;
}): Promise<PublishPipelineResult> {
  const timestamp = new Date().toISOString();
  const pagesUrl = 'https://a10129800.github.io/reading-notes-2.0/';
  const actionsUrl = 'https://github.com/a10129800/reading-notes-2.0/actions';

  const result: PublishPipelineResult = {
    success: false,
    timestamp,
    stages: {
      localSync: { id: 'localSync', name: '本機公開資料同步', status: 'pending' },
      securityCheck: { id: 'securityCheck', name: '公開資料安全檢查', status: 'pending' },
      siteBuild: { id: 'siteBuild', name: '靜態網站建置檢驗', status: 'pending' },
      gitCommit: { id: 'gitCommit', name: 'Git 精準暫存與提交', status: 'pending' },
      gitPush: { id: 'gitPush', name: '推送至 GitHub master', status: 'pending' },
      actionsDeploy: { id: 'actionsDeploy', name: 'GitHub Actions 部署', status: 'pending' },
    },
    summary: {
      publishedBooks: [],
      publishedCount: 0,
      removedCount: 0,
      pushed: false,
      actionsUrl,
      pagesUrl,
    },
  };

  try {
    // -------------------------------------------------------------
    // STAGE 1: 本機公開資料同步 (Local Whitelist Sync)
    // -------------------------------------------------------------
    result.stages.localSync.status = 'in_progress';
    const syncRes = publishWhitelistedBooks();
    result.summary.publishedBooks = syncRes.publishedBooks;
    result.summary.publishedCount = syncRes.publishedCount;
    result.summary.removedCount = syncRes.removedCount;
    result.stages.localSync.status = 'success';
    result.stages.localSync.message = `成功同步 ${syncRes.publishedCount} 本公開書籍（${syncRes.publishedBooks.join('、')}）`;
    result.stages.localSync.details = syncRes;

    // -------------------------------------------------------------
    // STAGE 2: 公開資料安全檢查 (Zero-Leakage Security Verification)
    // -------------------------------------------------------------
    result.stages.securityCheck.status = 'in_progress';
    const secRes = verifyPublicBooksSecurity();
    if (!secRes.valid) {
      result.stages.securityCheck.status = 'failed';
      result.stages.securityCheck.message = secRes.error;
      throw new Error(`安全檢查未通過：${secRes.error}`);
    }
    result.stages.securityCheck.status = 'success';
    result.stages.securityCheck.message = '全數符合公開白名單，無草稿、私人書籍或敏感附件';

    // -------------------------------------------------------------
    // STAGE 3: 靜態網站建置檢驗 (Vite Production Build)
    // -------------------------------------------------------------
    result.stages.siteBuild.status = 'in_progress';
    const buildRes = await runViteBuild();
    if (!buildRes.success) {
      result.stages.siteBuild.status = 'failed';
      result.stages.siteBuild.message = `建置失敗：${buildRes.error}`;
      throw new Error(`靜態建置檢驗未通過：${buildRes.error}`);
    }
    result.stages.siteBuild.status = 'success';
    result.stages.siteBuild.message = '生產環境靜態建置打包成功 (dist/)';

    // If options.commitAndPush is false, we stop here (dry-run mode for audit/preview)
    if (!options.commitAndPush) {
      result.stages.gitCommit.status = 'skipped';
      result.stages.gitCommit.message = '本機模式：已略過 Git Commit';
      result.stages.gitPush.status = 'skipped';
      result.stages.gitPush.message = '本機模式：已略過 Git Push';
      result.stages.actionsDeploy.status = 'skipped';
      result.stages.actionsDeploy.message = '本機模式：未觸發遠端部署';
      result.success = true;
      return result;
    }

    // -------------------------------------------------------------
    // STAGE 4: Git 精準暫存與提交 (Git Stage & Commit)
    // -------------------------------------------------------------
    result.stages.gitCommit.status = 'in_progress';
    const { stagedFiles, hasChanges } = await stagePublicBooksOnly();

    if (!hasChanges) {
      result.stages.gitCommit.status = 'skipped';
      result.stages.gitCommit.message = '公開書庫內容與先前提交一致，無新增或修改檔案';
      result.stages.gitPush.status = 'skipped';
      result.stages.gitPush.message = '遠端已是最新狀態，無需重複推送';
      result.stages.actionsDeploy.status = 'success';
      result.stages.actionsDeploy.message = '公開網站已保持最新發布狀態';
      result.success = true;
      return result;
    }

    // Remote safety check before committing & pushing
    const remoteCheck = await checkRemoteSafety();
    if (!remoteCheck.safe) {
      result.stages.gitCommit.status = 'failed';
      result.stages.gitCommit.message = remoteCheck.message;
      throw new Error(remoteCheck.message);
    }

    // Create Git commit
    const bookTitleSummary = syncRes.publishedBooks.slice(0, 3).join('、') + (syncRes.publishedBooks.length > 3 ? ' 等' : '');
    const commitMsg = `chore(publish): sync public notes (${bookTitleSummary})`;
    const commitRes = await runGit(['commit', '-m', commitMsg]);
    if (commitRes.code !== 0) {
      result.stages.gitCommit.status = 'failed';
      result.stages.gitCommit.message = `Git Commit 失敗：${commitRes.stderr}`;
      throw new Error(`Git Commit 失敗：${commitRes.stderr}`);
    }

    const hashRes = await runGit(['rev-parse', '--short', 'HEAD']);
    const newCommitHash = hashRes.stdout;
    result.summary.commitHash = newCommitHash;
    result.stages.gitCommit.status = 'success';
    result.stages.gitCommit.message = `成功建立提交 [${newCommitHash}]：${commitMsg}`;
    result.stages.gitCommit.details = { commitHash: newCommitHash, stagedFiles };

    // -------------------------------------------------------------
    // STAGE 5: 推送至 GitHub master (Git Push)
    // -------------------------------------------------------------
    result.stages.gitPush.status = 'in_progress';
    const pushRes = await runGit(['push', 'origin', 'master']);
    if (pushRes.code !== 0) {
      result.stages.gitPush.status = 'failed';
      result.stages.gitPush.message = `Git Push 失敗：${pushRes.stderr}`;
      // Note: Data is retained locally and committed, so user can retry push
      throw new Error(`Git Push 失敗：${pushRes.stderr}`);
    }

    result.summary.pushed = true;
    result.stages.gitPush.status = 'success';
    result.stages.gitPush.message = `已成功推送到 origin/master (Commit: ${newCommitHash})`;

    // -------------------------------------------------------------
    // STAGE 6: GitHub Actions 部署 (Deployment Tracking)
    // -------------------------------------------------------------
    result.stages.actionsDeploy.status = 'in_progress';
    result.stages.actionsDeploy.message = '已觸發 GitHub Actions，雲端建置與部署流水線執行中...';
    result.success = true;

    // Initial deployment status check
    const depStatus = await fetchDeploymentStatus();
    if (depStatus.status === 'completed' && depStatus.conclusion === 'success' && depStatus.commitHash === newCommitHash) {
      result.stages.actionsDeploy.status = 'success';
      result.stages.actionsDeploy.message = 'GitHub Actions 部署完成！公開網站已更新';
    } else {
      result.stages.actionsDeploy.details = depStatus;
    }

    return result;
  } catch (err: any) {
    result.success = false;
    result.error = err.message;
    return result;
  }
}

