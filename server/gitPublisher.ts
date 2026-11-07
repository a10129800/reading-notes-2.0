import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import util from 'util';
import {
  publishWhitelistedBooks,
  PUBLIC_CONTENT_DIR,
  getPublicContentDir,
  detectImageFormat,
  ALLOWED_COVER_FILENAMES,
  MAX_COVER_SIZE,
  savePublishRecord,
  getPublishHistory,
} from './storage';
import { PublishPipelineResult, DeploymentStatus, PublishRecord } from '../src/types';

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
      env: {
        ...process.env,
        VITE_ENABLE_MANAGER: 'false',
        VITE_APP_MODE: 'public',
        NODE_ENV: 'production',
      },
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
 * Deep security verification for public books directory
 */
export function verifyPublicBooksSecurity(): { valid: boolean; error?: string } {
  const publicDir = getPublicContentDir ? getPublicContentDir() : PUBLIC_CONTENT_DIR;
  const manifestPath = path.join(publicDir, 'books-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return { valid: false, error: 'books-manifest.json 不存在於公開書籍目錄中' };
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    for (const book of manifest.books || []) {
      if (book.status !== 'public') {
        return { valid: false, error: `安全違規：書籍 "${book.title}" 在公開清單中狀態為 "${book.status}"！僅允許 public！` };
      }
    }

    const entries = fs.readdirSync(publicDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const bookJsonPath = path.join(publicDir, entry.name, 'book.json');
        if (!fs.existsSync(bookJsonPath)) {
          return { valid: false, error: `安全警告：目錄 "${entry.name}" 缺少 book.json！` };
        }
        const bData = JSON.parse(fs.readFileSync(bookJsonPath, 'utf-8'));
        if (bData.status !== 'public') {
          return { valid: false, error: `安全違規：目錄 "${entry.name}" 內書籍狀態非 public ("${bData.status}")！` };
        }

        // Check files in public-books directory (Strict single cover whitelist)
        const files = fs.readdirSync(path.join(publicDir, entry.name));
        let coverCount = 0;
        for (const file of files) {
          const filePath = path.join(publicDir, entry.name, file);
          const ext = path.extname(file).toLowerCase();
          const lowerName = file.toLowerCase();

          if (ALLOWED_COVER_FILENAMES.includes(lowerName as any)) {
            coverCount++;
            if (coverCount > 1) {
              return { valid: false, error: `安全違規：目錄 "${entry.name}" 發現多於一個封面圖檔！` };
            }
            const stat = fs.statSync(filePath);
            if (stat.size === 0) {
              return { valid: false, error: `安全違規：封面檔案 "${file}" 為空檔案 (0 bytes)！` };
            }
            if (stat.size > MAX_COVER_SIZE) {
              return { valid: false, error: `安全違規：封面檔案 "${file}" 超過 5MB 上限！` };
            }
            const buf = fs.readFileSync(filePath);
            if (!detectImageFormat(buf)) {
              return { valid: false, error: `安全違規：封面檔案 "${file}" 簽章無效，非合法之圖片檔案！` };
            }
            const expectedPath = `content/public-books/${entry.name}/${file}`;
            if (bData.coverImage !== expectedPath && !bData.coverImage.endsWith(`/${file}`)) {
              return { valid: false, error: `安全違規：書籍 "${entry.name}" book.json 的 coverImage 必須指向 "${expectedPath}"！` };
            }
          } else if (file === 'book.json' || file.endsWith('.json')) {
            // Valid JSON file
          } else {
            return { valid: false, error: `安全違規：公開資料夾中發現未授權之附件或非封面圖片檔（原始附件或圖片檔 "${file}"）！` };
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
 * Global mutex and task tracker for publishing
 */
let activePublishTask: PublishPipelineResult | null = null;

export function getActivePublishTask(): PublishPipelineResult | null {
  return activePublishTask;
}

/**
 * Precision stage: only content/public-books/
 * Strictly prevents git add . or staging files outside content/public-books
 * Automatically detects if the only difference is generatedAt timestamp
 * Strictly protects pre-existing user staged files
 */
export async function stagePublicBooksOnly(): Promise<{
  stagedFiles: string[];
  newlyStagedFiles: string[];
  hasChanges: boolean;
}> {
  // 1. Inspect pre-existing staged files BEFORE running git add
  const preStagedRes = await runGit(['diff', '--cached', '--name-only']);
  const preStagedFiles = preStagedRes.stdout.split('\n').map(s => s.trim()).filter(Boolean);

  // 2. Protect user's pre-staged state:
  // If non-public files are already staged, ABORT IMMEDIATELY without modifying staging area!
  const preStagedNonPublic = preStagedFiles.filter(f => !f.replace(/\\/g, '/').startsWith('content/public-books/'));
  if (preStagedNonPublic.length > 0) {
    throw new Error(
      `[GIT ALERT] 暫存區中已存在非公開檔案（如 "${preStagedNonPublic[0]}"）。為保護您的工作狀態，發布已中止且未變更任何暫存狀態。請先提交或取消暫存該檔案後再發布。`
    );
  }

  // 3. Stage only content/public-books/
  const addRes = await runGit(['add', 'content/public-books/']);
  if (addRes.code !== 0) {
    throw new Error(`Git Add 失敗：${addRes.stderr}`);
  }

  // 4. Inspect staged files after git add
  const stagedRes = await runGit(['diff', '--cached', '--name-only']);
  let stagedFiles = stagedRes.stdout.split('\n').map(s => s.trim()).filter(Boolean);

  // 5. Identify files newly staged by this publish operation
  let newlyStagedFiles = stagedFiles.filter(f => !preStagedFiles.includes(f));

  // 6. Safety guard: verify all staged files start with content/public-books/
  for (const file of stagedFiles) {
    const normalized = file.replace(/\\/g, '/');
    if (!normalized.startsWith('content/public-books/')) {
      if (newlyStagedFiles.includes(file)) {
        await runGit(['restore', '--staged', file]);
      }
      throw new Error(`[SECURITY ALERT] 非公開檔案 "${file}" 被意外暫存，已終止發布！`);
    }
  }

  // 7. Smart diff: If ONLY books-manifest.json is staged, check if the change is only generatedAt
  if (stagedFiles.length === 1 && stagedFiles[0].replace(/\\/g, '/') === 'content/public-books/books-manifest.json') {
    const diffRes = await runGit(['diff', '--cached', '-U0', 'content/public-books/books-manifest.json']);
    const lines = diffRes.stdout.split('\n').filter(l => (l.startsWith('+') || l.startsWith('-')) && !l.startsWith('+++') && !l.startsWith('---'));
    const isOnlyGeneratedAt = lines.length > 0 && lines.every(l => l.includes('"generatedAt"'));
    if (isOnlyGeneratedAt) {
      await runGit(['restore', '--staged', 'content/public-books/books-manifest.json']);
      stagedFiles = [];
      newlyStagedFiles = [];
    }
  }

  return {
    stagedFiles,
    newlyStagedFiles,
    hasChanges: stagedFiles.length > 0,
  };
}

/**
 * Fetch latest GitHub Actions workflow run and Pages deployment status
 * Supports tracking specific target commit hash with failed step inspection
 */
export async function fetchDeploymentStatus(targetCommitHash?: string): Promise<DeploymentStatus> {
  const repo = 'a10129800/reading-notes-2.0';
  const runsUrl = `https://api.github.com/repos/${repo}/actions/runs?branch=master&per_page=10`;
  const depsUrl = `https://api.github.com/repos/${repo}/deployments?environment=github-pages&per_page=5`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(runsUrl, {
      headers: {
        'User-Agent': 'Reading-Notes-Manager/2.0',
        'Accept': 'application/vnd.github.v3+json',
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      clearTimeout(timeout);
      return {
        status: 'unknown',
        htmlUrl: `https://github.com/${repo}/actions`,
      };
    }

    const data = await res.json();
    const runs: any[] = data.workflow_runs || [];

    // Find run matching targetCommitHash if provided, otherwise latest run
    const cleanTarget = targetCommitHash?.trim().toLowerCase();
    let targetRun = runs[0];

    if (cleanTarget) {
      // Must be a 40-character hexadecimal SHA
      const is40CharHex = /^[0-9a-f]{40}$/.test(cleanTarget);
      if (!is40CharHex) {
        clearTimeout(timeout);
        return {
          status: 'unknown',
          isMatchSha: false,
          commitHash: cleanTarget,
          pagesStatus: 'pending',
          htmlUrl: `https://github.com/${repo}/actions`,
        };
      }

      // Exact full 40-character string match only (no startsWith, no short prefix)
      const matched = runs.find(r =>
        r.head_sha && r.head_sha.trim().toLowerCase() === cleanTarget
      );
      if (matched) {
        targetRun = matched;
      } else {
        // Run hasn't been scheduled yet by GitHub
        clearTimeout(timeout);
        return {
          status: 'queued',
          isMatchSha: false,
          commitHash: cleanTarget,
          pagesStatus: 'pending',
          htmlUrl: `https://github.com/${repo}/actions`,
        };
      }
    }

    if (!targetRun) {
      clearTimeout(timeout);
      return {
        status: 'idle',
        htmlUrl: `https://github.com/${repo}/actions`,
      };
    }

    let mappedStatus: DeploymentStatus['status'] = 'unknown';
    if (targetRun.status === 'queued') mappedStatus = 'queued';
    else if (targetRun.status === 'in_progress') mappedStatus = 'in_progress';
    else if (targetRun.status === 'completed') mappedStatus = 'completed';

    let failedStep: string | undefined;

    // If workflow failed, fetch jobs to find the exact step that failed
    if (targetRun.conclusion === 'failure') {
      try {
        const jobsRes = await fetch(`https://api.github.com/repos/${repo}/actions/runs/${targetRun.id}/jobs`, {
          headers: {
            'User-Agent': 'Reading-Notes-Manager/2.0',
            'Accept': 'application/vnd.github.v3+json',
          },
          signal: controller.signal,
        });
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          for (const job of jobsData.jobs || []) {
            const fStep = job.steps?.find((s: any) => s.conclusion === 'failure');
            if (fStep) {
              failedStep = fStep.name;
              break;
            }
          }
        }
      } catch {}
    }

    // Query GitHub Pages deployment records
    let pagesStatus: DeploymentStatus['pagesStatus'] = 'unknown';
    let pagesDeploymentId: number | undefined;
    let pagesDeploymentSha: string | undefined;
    let targetDep: any = null;

    try {
      const depsRes = await fetch(depsUrl, {
        headers: {
          'User-Agent': 'Reading-Notes-Manager/2.0',
          'Accept': 'application/vnd.github.v3+json',
        },
        signal: controller.signal,
      });
      if (depsRes.ok) {
        const depsData = await depsRes.json();
        if (Array.isArray(depsData)) {
          targetDep = null;

          if (cleanTarget) {
            const is40CharHex = /^[0-9a-f]{40}$/.test(cleanTarget);
            if (is40CharHex) {
              const matchedDep = depsData.find(d => {
                if (!d || !d.sha || typeof d.sha !== 'string') return false;
                return d.sha.trim().toLowerCase() === cleanTarget;
              });

              if (matchedDep) {
                targetDep = matchedDep;
              } else {
                // Target commit does not have a Pages Deployment yet
                // STRICT P1 REQUIREMENT: NEVER fallback to depsData[0] (which is an older deployment)!
                pagesStatus = 'pending';
                pagesDeploymentSha = undefined;
              }
            } else {
              pagesStatus = 'pending';
              pagesDeploymentSha = undefined;
            }
          } else {
            // No target commit specified (general query of latest live state)
            if (depsData.length > 0) {
              targetDep = depsData[0];
            }
          }

          if (targetDep) {
            pagesDeploymentId = targetDep.id;
            pagesDeploymentSha = targetDep.sha ? targetDep.sha.trim().toLowerCase() : undefined;

            if (targetDep.statuses_url) {
              const stRes = await fetch(targetDep.statuses_url, {
                headers: {
                  'User-Agent': 'Reading-Notes-Manager/2.0',
                  'Accept': 'application/vnd.github.v3+json',
                },
                signal: controller.signal,
              });
              if (stRes.ok) {
                const statuses = await stRes.json();
                const latestSt = statuses[0]?.state;
                if (latestSt === 'success') pagesStatus = 'success';
                else if (latestSt === 'in_progress' || latestSt === 'pending') pagesStatus = 'in_progress';
                else if (latestSt === 'failure' || latestSt === 'error') pagesStatus = 'failed';
                else pagesStatus = 'unknown';
              }
            }
          }
        }
      }
    } catch {}

    let isMatchSha = false;
    if (cleanTarget) {
      const isWorkflowShaMatch = targetRun?.head_sha?.trim().toLowerCase() === cleanTarget;
      const isPagesShaMatch = targetDep?.sha?.trim().toLowerCase() === cleanTarget;
      isMatchSha = Boolean(isWorkflowShaMatch && isPagesShaMatch);
    }

    clearTimeout(timeout);

    return {
      status: mappedStatus,
      conclusion: targetRun?.conclusion,
      runId: targetRun?.id,
      commitHash: targetRun?.head_sha ? targetRun.head_sha.trim().toLowerCase() : cleanTarget,
      htmlUrl: targetRun?.html_url || `https://github.com/${repo}/actions`,
      updatedAt: targetRun?.updated_at,
      failedStep,
      pagesStatus,
      pagesDeploymentId,
      pagesDeploymentSha: targetDep?.sha ? targetDep.sha.trim().toLowerCase() : undefined,
      isMatchSha,
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
 * Enhanced with mutex locking, real-time stage tracking, and persistent history
 */
export async function executePublishPipeline(options: {
  commitAndPush: boolean;
  taskId?: string;
}): Promise<PublishPipelineResult> {
  // Mutex check: prevent concurrent publishing
  if (activePublishTask) {
    const isRunning = Object.values(activePublishTask.stages).some(s => s.status === 'in_progress');
    if (isRunning) {
      throw new Error('發布任務正在執行中，請等待當前任務完成。');
    }
  }

  const taskId = options.taskId || ('pub-' + Date.now());
  const timestamp = new Date().toISOString();
  const pagesUrl = 'https://a10129800.github.io/reading-notes-2.0/';
  const actionsUrl = 'https://github.com/a10129800/reading-notes-2.0/actions';

  const result: PublishPipelineResult = {
    taskId,
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
      hasContentChanges: true,
      actionsUrl,
      pagesUrl,
    },
  };

  activePublishTask = result;
  let newlyStagedFiles: string[] = [];

  const persistCurrentRecord = (finalStatus: 'running' | 'success' | 'failed' | 'skipped') => {
    savePublishRecord({
      taskId,
      startedAt: timestamp,
      completedAt: finalStatus !== 'running' ? new Date().toISOString() : undefined,
      status: finalStatus,
      commitHash: result.summary.commitHash,
      pushed: result.summary.pushed,
      hasContentChanges: result.summary.hasContentChanges !== false,
      actionsRunId: result.summary.actionsUrl?.includes('/runs/') ? undefined : undefined,
      failedStep: result.summary.failedStep,
      stages: result.stages,
      publishedBooks: result.summary.publishedBooks,
      error: result.error,
    });
  };

  try {
    persistCurrentRecord('running');

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
    persistCurrentRecord('running');

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
    persistCurrentRecord('running');

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
    persistCurrentRecord('running');

    // If options.commitAndPush is false, we stop here (dry-run mode for audit/preview)
    if (!options.commitAndPush) {
      result.stages.gitCommit.status = 'skipped';
      result.stages.gitCommit.message = '本機模式：已略過 Git Commit';
      result.stages.gitPush.status = 'skipped';
      result.stages.gitPush.message = '本機模式：已略過 Git Push';
      result.stages.actionsDeploy.status = 'skipped';
      result.stages.actionsDeploy.message = '本機模式：未觸發遠端部署';
      result.success = true;
      persistCurrentRecord('success');
      activePublishTask = null;
      return result;
    }

    // -------------------------------------------------------------
    // STAGE 4: Git 精準暫存與提交 (Git Stage & Commit)
    // -------------------------------------------------------------
    result.stages.gitCommit.status = 'in_progress';
    const stageResult = await stagePublicBooksOnly();
    newlyStagedFiles = stageResult.newlyStagedFiles;
    const { stagedFiles, hasChanges } = stageResult;

    if (!hasChanges) {
      result.summary.hasContentChanges = false;
      result.stages.gitCommit.status = 'skipped';
      result.stages.gitCommit.message = '公開書庫內容與先前提交一致，無新增或修改檔案';
      result.stages.gitPush.status = 'skipped';
      result.stages.gitPush.message = '遠端已是最新狀態，無需重複推送';
      result.stages.actionsDeploy.status = 'skipped';
      result.stages.actionsDeploy.message = '公開內容沒有變更，無須發布';
      result.success = true;
      persistCurrentRecord('skipped');
      activePublishTask = null;
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

    const hashRes = await runGit(['rev-parse', 'HEAD']);
    const newCommitHash = hashRes.stdout.trim();
    result.summary.commitHash = newCommitHash;
    result.stages.gitCommit.status = 'success';
    result.stages.gitCommit.message = `成功建立提交 [${newCommitHash.slice(0, 7)}]：${commitMsg}`;
    result.stages.gitCommit.details = { commitHash: newCommitHash, stagedFiles };
    persistCurrentRecord('running');

    // -------------------------------------------------------------
    // STAGE 5: 推送至 GitHub master (Git Push)
    // -------------------------------------------------------------
    result.stages.gitPush.status = 'in_progress';
    const pushRes = await runGit(['push', 'origin', 'master']);
    if (pushRes.code !== 0) {
      result.stages.gitPush.status = 'failed';
      result.stages.gitPush.message = `Git Push 失敗：${pushRes.stderr}`;
      throw new Error(`Git Push 失敗：${pushRes.stderr}`);
    }

    result.summary.pushed = true;
    result.stages.gitPush.status = 'success';
    result.stages.gitPush.message = `已成功推送到 origin/master (Commit: ${newCommitHash.slice(0, 7)})`;
    persistCurrentRecord('running');

    // -------------------------------------------------------------
    // STAGE 6: GitHub Actions 部署 (Deployment Tracking)
    // -------------------------------------------------------------
    result.stages.actionsDeploy.status = 'in_progress';
    result.stages.actionsDeploy.message = '已觸發 GitHub Actions，雲端建置與部署流水線執行中...';
    result.success = true;

    // Initial deployment status check with target full 40-char commit hash
    const depStatus = await fetchDeploymentStatus(newCommitHash);
    const isShaMatched = Boolean(
      depStatus.isMatchSha &&
      depStatus.pagesDeploymentSha === newCommitHash &&
      depStatus.commitHash === newCommitHash
    );
    if (depStatus.status === 'completed' && depStatus.conclusion === 'success' && depStatus.pagesStatus === 'success' && isShaMatched) {
      result.stages.actionsDeploy.status = 'success';
      result.stages.actionsDeploy.message = 'GitHub Actions 與 Pages 部署完成！公開網站已更新';
    } else {
      result.stages.actionsDeploy.details = depStatus;
    }

    persistCurrentRecord('success');
    activePublishTask = null;
    return result;
  } catch (err: any) {
    result.success = false;
    result.error = err.message;
    // Clean up ONLY newly staged files if failure happened before push
    if (newlyStagedFiles && newlyStagedFiles.length > 0 && !result.summary.pushed) {
      for (const f of newlyStagedFiles) {
        try { await runGit(['restore', '--staged', f]); } catch {}
      }
    }
    persistCurrentRecord('failed');
    activePublishTask = null;
    return result;
  }
}

