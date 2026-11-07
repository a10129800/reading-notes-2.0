import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  verifyPublicBooksSecurity,
  checkRemoteSafety,
  stagePublicBooksOnly,
  runGit,
  getActivePublishTask,
  fetchDeploymentStatus,
} from '../server/gitPublisher';
import {
  saveMasterBook,
  publishWhitelistedBooks,
  savePublishRecord,
  getPublishHistory,
  getPublishRecordById,
  PUBLIC_CONTENT_DIR,
  PRIVATE_DATA_DIR,
} from '../server/storage';
import { Book, PublishRecord, PublishPipelineResult } from '../src/types';
import { localApiService } from '../src/services/localApiService';
import { PublishPage } from '../src/pages/manager/PublishPage';

// Mock window.matchMedia for JSDOM if needed
if (typeof window !== 'undefined') {
  window.matchMedia = window.matchMedia || function () {
    return {
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as any;
  };
}

describe('Publish Pipeline Security & Git Flow Tests', () => {
  const testPrivateBookId = 'test-pipeline-private-book';
  const testDraftBookId = 'test-pipeline-draft-book';
  const testPublicBookId = 'test-pipeline-public-book';

  beforeEach(() => {
    // Setup clean environment
  });

  afterEach(() => {
    // Clean test books from private storage
    const booksDir = path.join(PRIVATE_DATA_DIR, 'books');
    [testPrivateBookId, testDraftBookId, testPublicBookId].forEach(id => {
      const p = path.join(booksDir, id);
      if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
      const pubP = path.join(PUBLIC_CONTENT_DIR, id);
      if (fs.existsSync(pubP)) fs.rmSync(pubP, { recursive: true, force: true });
    });
    const historyPath = path.join(PRIVATE_DATA_DIR, 'publish-history.json');
    if (fs.existsSync(historyPath)) {
      try { fs.unlinkSync(historyPath); } catch {}
    }
    cleanup();
    vi.restoreAllMocks();
  });

  it('1. verifyPublicBooksSecurity passes when all manifest and book.json files are public', () => {
    const res = verifyPublicBooksSecurity();
    expect(res.valid).toBe(true);
  });

  it('2. verifyPublicBooksSecurity strictly catches any non-public book injected into public folder', () => {
    // Temporarily inject a draft folder into public-books
    const fakeDir = path.join(PUBLIC_CONTENT_DIR, 'fake-leaked-draft');
    fs.mkdirSync(fakeDir, { recursive: true });
    fs.writeFileSync(path.join(fakeDir, 'book.json'), JSON.stringify({
      id: 'fake-leaked-draft',
      title: 'Leaked Draft',
      status: 'draft',
    }), 'utf-8');

    try {
      const res = verifyPublicBooksSecurity();
      expect(res.valid).toBe(false);
      expect(res.error).toContain('安全違規');
    } finally {
      fs.rmSync(fakeDir, { recursive: true, force: true });
    }
  });

  it('3. verifyPublicBooksSecurity strictly catches forbidden image formats inside public-books', () => {
    const fakeImg = path.join(PUBLIC_CONTENT_DIR, 'test-public-book', 'raw-scan.jpg');
    fs.writeFileSync(fakeImg, 'fake binary scan data');

    try {
      const res = verifyPublicBooksSecurity();
      expect(res.valid).toBe(false);
      expect(res.error).toContain('原始附件或圖片檔');
    } finally {
      if (fs.existsSync(fakeImg)) fs.unlinkSync(fakeImg);
    }
  });

  it('4. publishWhitelistedBooks purges formerly public book when status changes to private', () => {
    // First save as public
    const book: Book = {
      id: testPublicBookId,
      title: 'Demotion Test Book',
      author: 'Tester',
      publisher: 'Test Publisher',
      publishDate: '2026-01-01',
      isbn: '978-0-00-000000-0',
      category: 'Test',
      status: 'public',
      readingStatus: 'reading',
      progress: 0,
      motivation: '',
      introduction: '',
      coreIdea: '',
      tags: [],
      chapters: [],
      startDate: '2026-01-01',
      coverImage: '',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    saveMasterBook(book);

    // Sync to public
    const res1 = publishWhitelistedBooks();
    expect(res1.publishedBooks).toContain('Demotion Test Book');
    expect(fs.existsSync(path.join(PUBLIC_CONTENT_DIR, testPublicBookId))).toBe(true);

    // Now change to private
    book.status = 'private';
    saveMasterBook(book);

    // Sync again
    const res2 = publishWhitelistedBooks();
    expect(res2.publishedBooks).not.toContain('Demotion Test Book');
    expect(res2.removedCount).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(path.join(PUBLIC_CONTENT_DIR, testPublicBookId))).toBe(false);
  });

  it('5. stagePublicBooksOnly strictly operates only within content/public-books/', async () => {
    const stageRes = await stagePublicBooksOnly();
    for (const f of stageRes.stagedFiles) {
      const normalized = f.replace(/\\/g, '/');
      expect(normalized.startsWith('content/public-books/')).toBe(true);
    }
    // Clean up staged state so automated testing leaves git index clean
    await runGit(['restore', '--staged', 'content/public-books/']);
  });

  it('6. checkRemoteSafety correctly verifies local head against origin/master', async () => {
    const remoteCheck = await checkRemoteSafety();
    // In our verified repository, local is either in sync or ahead (both safe)
    expect(remoteCheck.diverged).toBe(false);
    expect(remoteCheck.remoteAhead).toBe(false);
  });

  it('7. regression: verifies real repository content/public-books/51ml602210 integrity and manifest inclusion', () => {
    const repoPublicDir = path.resolve(process.cwd(), 'content/public-books');
    const book51Dir = path.join(repoPublicDir, '51ml602210');
    expect(fs.existsSync(book51Dir)).toBe(true);

    const bookJsonPath = path.join(book51Dir, 'book.json');
    expect(fs.existsSync(bookJsonPath)).toBe(true);
    const bookData = JSON.parse(fs.readFileSync(bookJsonPath, 'utf-8'));
    expect(bookData.id).toBe('51ml602210');
    expect(bookData.title).toBe('刑法總則（圖說）');
    expect(bookData.status).toBe('public');

    const chapterPath = path.join(book51Dir, 'intro-crime-concept.json');
    expect(fs.existsSync(chapterPath)).toBe(true);
    const chapterData = JSON.parse(fs.readFileSync(chapterPath, 'utf-8'));
    expect(chapterData.id).toBe('intro-crime-concept');
    expect(chapterData.bookId).toBe('51ml602210');

    // Verify manifest in repo lists 51ml602210
    const manifestPath = path.join(repoPublicDir, 'books-manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const found = manifest.books.find((b: any) => b.id === '51ml602210');
    expect(found).toBeDefined();
    expect(found.title).toBe('刑法總則（圖說）');
    expect(found.status).toBe('public');
  });

  it('8. regression: publishWhitelistedBooks operates strictly in sandbox and NEVER touches repo content/public-books', () => {
    const repoPublicDir = path.resolve(process.cwd(), 'content/public-books');
    const repoFilesBefore = fs.readdirSync(repoPublicDir);
    const book51Before = fs.readdirSync(path.join(repoPublicDir, '51ml602210'));

    // Execute publish in test sandbox
    const result = publishWhitelistedBooks();
    expect(result).toBeDefined();

    // Verify sandbox public dir has the published content
    expect(fs.existsSync(PUBLIC_CONTENT_DIR)).toBe(true);

    // Verify repository public content has ZERO changes
    const repoFilesAfter = fs.readdirSync(repoPublicDir);
    expect(repoFilesAfter).toEqual(repoFilesBefore);

    const book51After = fs.readdirSync(path.join(repoPublicDir, '51ml602210'));
    expect(book51After).toEqual(book51Before);
  });

  it('9. regression: demotion purge logic functions properly inside sandbox without affecting real repo', () => {
    const demoteBookId = 'test-demote-sandbox-book';
    const sandboxBook: Book = {
      id: demoteBookId,
      title: 'Sandbox Demotion Book',
      author: 'Tester',
      publisher: 'Test Press',
      publishDate: '2026-01-01',
      isbn: '978-0-12-345678-9',
      category: 'Test',
      status: 'public',
      readingStatus: 'reading',
      progress: 50,
      motivation: 'Test',
      introduction: 'Test',
      coreIdea: 'Test',
      tags: ['test'],
      chapters: [],
      startDate: '2026-01-01',
      coverImage: '',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // 1. Save in sandbox private and publish
    saveMasterBook(sandboxBook);
    const res1 = publishWhitelistedBooks();
    expect(res1.publishedBooks).toContain('Sandbox Demotion Book');
    expect(fs.existsSync(path.join(PUBLIC_CONTENT_DIR, demoteBookId))).toBe(true);

    // 2. Demote to private
    sandboxBook.status = 'private';
    saveMasterBook(sandboxBook);
    const res2 = publishWhitelistedBooks();
    expect(res2.removedCount).toBeGreaterThanOrEqual(1);

    // 3. Verify purged from sandbox public
    expect(fs.existsSync(path.join(PUBLIC_CONTENT_DIR, demoteBookId))).toBe(false);

    // 4. Verify repo content/public-books is completely untouched and 51ml602210 remains intact
    const repo51Path = path.resolve(process.cwd(), 'content/public-books/51ml602210/book.json');
    expect(fs.existsSync(repo51Path)).toBe(true);
  });

  it('10. publishWhitelistedBooks preserves existing generatedAt if content has zero modifications', () => {
    // Sync first time
    publishWhitelistedBooks();
    const manifestPath = path.join(PUBLIC_CONTENT_DIR, 'books-manifest.json');
    const firstGenAt = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')).generatedAt;

    // Sync again without changing any books
    publishWhitelistedBooks();
    const secondGenAt = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')).generatedAt;
    expect(secondGenAt).toBe(firstGenAt);
  });

  it('11. getPublishHistory and savePublishRecord safely persist and restore publish history in private storage', () => {
    const testRecord: PublishRecord = {
      taskId: 'test-task-1',
      startedAt: new Date().toISOString(),
      status: 'success',
      commitHash: 'e1eba9e1340786bbc835884048433e6bf427d39b',
      pushed: true,
      hasContentChanges: true,
      publishedBooks: ['Test Book'],
      stages: {},
    };
    savePublishRecord(testRecord);
    const history = getPublishHistory();
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].taskId).toBe('test-task-1');
    expect(history[0].commitHash).toBe('e1eba9e1340786bbc835884048433e6bf427d39b');

    // Confirm publish-history.json is NOT in public content dir
    expect(fs.existsSync(path.join(PUBLIC_CONTENT_DIR, 'publish-history.json'))).toBe(false);
  });

  it('12. getActivePublishTask returns null when no publish pipeline is active', () => {
    expect(getActivePublishTask()).toBeNull();
  });

  it('13. getPublishRecordById accurately locates specific task and returns null for unknown task (P2)', () => {
    const recordA: PublishRecord = {
      taskId: 'task-p2-alpha',
      startedAt: '2026-11-06T10:00:00.000Z',
      status: 'success',
      commitHash: 'aaa1111',
      pushed: true,
      hasContentChanges: true,
      publishedBooks: ['Book Alpha'],
      stages: {},
    };
    const recordB: PublishRecord = {
      taskId: 'task-p2-beta',
      startedAt: '2026-11-06T10:05:00.000Z',
      status: 'skipped',
      commitHash: 'bbb2222',
      pushed: false,
      hasContentChanges: false,
      publishedBooks: ['Book Beta'],
      stages: {},
    };

    savePublishRecord(recordA);
    savePublishRecord(recordB);

    const foundA = getPublishRecordById('task-p2-alpha');
    expect(foundA).not.toBeNull();
    expect(foundA?.taskId).toBe('task-p2-alpha');
    expect(foundA?.commitHash).toBe('aaa1111');

    const foundB = getPublishRecordById('task-p2-beta');
    expect(foundB).not.toBeNull();
    expect(foundB?.taskId).toBe('task-p2-beta');
    expect(foundB?.status).toBe('skipped');

    const foundUnknown = getPublishRecordById('non-existent-task-id');
    expect(foundUnknown).toBeNull();
  });

  it('14. stagePublicBooksOnly aborts with [GIT ALERT] and preserves staged files when non-public files are pre-staged (P3)', async () => {
    const dummyFile = 'dummy-p3-staged.tmp';
    fs.writeFileSync(dummyFile, 'user work in progress');

    try {
      // Stage non-public file to simulate user work in progress
      await runGit(['add', dummyFile]);

      // Must abort immediately
      await expect(stagePublicBooksOnly()).rejects.toThrow(/\[GIT ALERT\]/);

      // Verify user staged file is 100% untouched and STILL staged
      const checkStaged = await runGit(['diff', '--cached', '--name-only']);
      const files = checkStaged.stdout.split('\n').map(s => s.trim().replace(/\\/g, '/'));
      expect(files).toContain(dummyFile);
    } finally {
      // Clean up test staged file and temporary file
      await runGit(['restore', '--staged', dummyFile]);
      if (fs.existsSync(dummyFile)) fs.unlinkSync(dummyFile);
    }
  });

  const TARGET_SHA_40 = 'e1eba9e1340786bbc835884048433e6bf427d39b';
  const SAME_PREFIX_DIFF_SHA_40 = 'e1eba9e000000000000000000000000000000000';
  const SHORT_SHA_7 = 'e1eba9e';
  const DIFF_SHA_40 = '4edd88bfe94c8c35eb7ca187af6a60ea5a04bd14';
  const OLDER_DEPLOYMENT_SHA_40 = 'ac9d3a0111111111111111111111111111111111';

  // -------------------------------------------------------------
  // P1: Full 40-character SHA Exact Match Suite
  // -------------------------------------------------------------

  it('15. P1: fetchDeploymentStatus with exact 40-char SHA match succeeds and preserves full 40-char SHA', async () => {
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/actions/runs')) {
          return {
            ok: true,
            json: async () => ({
              workflow_runs: [
                {
                  id: 102,
                  head_sha: TARGET_SHA_40,
                  status: 'completed',
                  conclusion: 'success',
                  updated_at: '2026-11-06T12:00:00Z',
                  html_url: 'https://github.com/a10129800/reading-notes-2.0/actions/runs/102',
                },
              ],
            }),
          } as any;
        }
        if (urlStr.includes('/deployments?')) {
          return {
            ok: true,
            json: async () => [
              {
                id: 1001,
                sha: TARGET_SHA_40,
                statuses_url: 'https://api.github.com/repos/a10129800/reading-notes-2.0/deployments/1001/statuses',
              },
            ],
          } as any;
        }
        if (urlStr.includes('/deployments/1001/statuses')) {
          return {
            ok: true,
            json: async () => [{ state: 'success' }],
          } as any;
        }
        return { ok: false } as any;
      };

      const result = await fetchDeploymentStatus(TARGET_SHA_40);
      expect(result.status).toBe('completed');
      expect(result.conclusion).toBe('success');
      expect(result.pagesStatus).toBe('success');
      expect(result.pagesDeploymentSha).toBe(TARGET_SHA_40);
      expect(result.pagesDeploymentSha?.length).toBe(40);
      expect(result.commitHash).toBe(TARGET_SHA_40);
      expect(result.pagesDeploymentId).toBe(1001);
      expect(result.isMatchSha).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('16. P1: fetchDeploymentStatus rejects when first 7 chars match but subsequent chars differ', async () => {
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/actions/runs')) {
          return {
            ok: true,
            json: async () => ({
              workflow_runs: [
                {
                  id: 103,
                  head_sha: SAME_PREFIX_DIFF_SHA_40,
                  status: 'completed',
                  conclusion: 'success',
                },
              ],
            }),
          } as any;
        }
        if (urlStr.includes('/deployments?')) {
          return {
            ok: true,
            json: async () => [
              {
                id: 1002,
                sha: SAME_PREFIX_DIFF_SHA_40,
                statuses_url: 'https://api.github.com/repos/a10129800/reading-notes-2.0/deployments/1002/statuses',
              },
            ],
          } as any;
        }
        return { ok: false } as any;
      };

      const result = await fetchDeploymentStatus(TARGET_SHA_40);
      expect(result.pagesStatus).toBe('pending');
      expect(result.pagesDeploymentSha).toBeUndefined();
      expect(result.isMatchSha).toBe(false);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('17. P1: fetchDeploymentStatus strictly rejects short SHA (7 chars) against full 40-char SHA', async () => {
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/actions/runs')) {
          return {
            ok: true,
            json: async () => ({
              workflow_runs: [
                {
                  id: 104,
                  head_sha: TARGET_SHA_40,
                  status: 'completed',
                  conclusion: 'success',
                },
              ],
            }),
          } as any;
        }
        if (urlStr.includes('/deployments?')) {
          return {
            ok: true,
            json: async () => [
              {
                id: 1003,
                sha: TARGET_SHA_40,
                statuses_url: 'https://api.github.com/repos/a10129800/reading-notes-2.0/deployments/1003/statuses',
              },
            ],
          } as any;
        }
        return { ok: false } as any;
      };

      const result = await fetchDeploymentStatus(SHORT_SHA_7);
      expect(result.pagesStatus).toBe('pending');
      expect(result.pagesDeploymentSha).toBeUndefined();
      expect(result.isMatchSha).toBe(false);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('18. P1: fetchDeploymentStatus strictly rejects completely different 40-char SHA', async () => {
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/actions/runs')) {
          return {
            ok: true,
            json: async () => ({
              workflow_runs: [
                {
                  id: 105,
                  head_sha: DIFF_SHA_40,
                  status: 'completed',
                  conclusion: 'success',
                },
              ],
            }),
          } as any;
        }
        if (urlStr.includes('/deployments?')) {
          return {
            ok: true,
            json: async () => [
              {
                id: 1004,
                sha: DIFF_SHA_40,
                statuses_url: 'https://api.github.com/repos/a10129800/reading-notes-2.0/deployments/1004/statuses',
              },
            ],
          } as any;
        }
        return { ok: false } as any;
      };

      const result = await fetchDeploymentStatus(TARGET_SHA_40);
      expect(result.pagesStatus).toBe('pending');
      expect(result.pagesDeploymentSha).toBeUndefined();
      expect(result.isMatchSha).toBe(false);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('19. P1: fetchDeploymentStatus maintains pending and NEVER adopts older deployment when target deployment is missing', async () => {
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/actions/runs')) {
          return {
            ok: true,
            json: async () => ({
              workflow_runs: [
                {
                  id: 106,
                  head_sha: TARGET_SHA_40,
                  status: 'completed',
                  conclusion: 'success',
                },
              ],
            }),
          } as any;
        }
        if (urlStr.includes('/deployments?')) {
          // GitHub returns older deployment for another commit
          return {
            ok: true,
            json: async () => [
              {
                id: 999,
                sha: OLDER_DEPLOYMENT_SHA_40,
                statuses_url: 'https://api.github.com/repos/a10129800/reading-notes-2.0/deployments/999/statuses',
              },
            ],
          } as any;
        }
        if (urlStr.includes('/deployments/999/statuses')) {
          // Older deployment was successful
          return {
            ok: true,
            json: async () => [{ state: 'success' }],
          } as any;
        }
        return { ok: false } as any;
      };

      const result = await fetchDeploymentStatus(TARGET_SHA_40);
      expect(result.status).toBe('completed');
      expect(result.conclusion).toBe('success');
      expect(result.pagesStatus).toBe('pending');
      expect(result.pagesDeploymentSha).toBeUndefined();
      expect(result.isMatchSha).toBe(false);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('20. P1: fetchDeploymentStatus verifies pagesDeploymentSha preserves complete 40-character SHA without truncation', async () => {
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/actions/runs')) {
          return {
            ok: true,
            json: async () => ({
              workflow_runs: [{ id: 107, head_sha: TARGET_SHA_40, status: 'completed', conclusion: 'success' }],
            }),
          } as any;
        }
        if (urlStr.includes('/deployments?')) {
          return {
            ok: true,
            json: async () => [{ id: 1007, sha: TARGET_SHA_40, statuses_url: 'https://api.github.com/repos/a10129800/reading-notes-2.0/deployments/1007/statuses' }],
          } as any;
        }
        if (urlStr.includes('/deployments/1007/statuses')) {
          return {
            ok: true,
            json: async () => [{ state: 'success' }],
          } as any;
        }
        return { ok: false } as any;
      };

      const result = await fetchDeploymentStatus(TARGET_SHA_40);
      expect(result.pagesDeploymentSha).toBe(TARGET_SHA_40);
      expect(result.pagesDeploymentSha?.length).toBe(40);
    } finally {
      global.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------
  // P2: Frontend Disconnect Recovery & Reload Verification Suite
  // -------------------------------------------------------------

  const mockRunningTask: PublishPipelineResult = {
    taskId: 'pub-test-running-123',
    success: false,
    timestamp: new Date().toISOString(),
    stages: {
      localSync: { id: 'localSync', name: '本機公開資料同步', status: 'success', message: '已同步 1 本' },
      securityCheck: { id: 'securityCheck', name: '公開資料安全檢查', status: 'in_progress', message: '檢查中' },
      siteBuild: { id: 'siteBuild', name: '靜態網站建置檢驗', status: 'pending' },
      gitCommit: { id: 'gitCommit', name: 'Git 精準暫存與提交', status: 'pending' },
      gitPush: { id: 'gitPush', name: '推送至 GitHub master', status: 'pending' },
      actionsDeploy: { id: 'actionsDeploy', name: 'GitHub Actions 部署', status: 'pending' },
    },
    summary: {
      publishedBooks: ['刑法總則（圖說）'],
      publishedCount: 1,
      removedCount: 0,
      pushed: false,
      hasContentChanges: true,
      actionsUrl: 'https://github.com/a10129800/reading-notes-2.0/actions',
      pagesUrl: 'https://a10129800.github.io/reading-notes-2.0/',
    },
  };

  const mockCompletedRecord: PublishRecord = {
    taskId: 'pub-test-completed-456',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: 'success',
    commitHash: TARGET_SHA_40,
    pushed: true,
    hasContentChanges: true,
    publishedBooks: ['刑法總則（圖說）'],
    stages: {
      localSync: { id: 'localSync', name: '本機公開資料同步', status: 'success' },
      securityCheck: { id: 'securityCheck', name: '公開資料安全檢查', status: 'success' },
      siteBuild: { id: 'siteBuild', name: '靜態網站建置檢驗', status: 'success' },
      gitCommit: { id: 'gitCommit', name: 'Git 精準暫存與提交', status: 'success' },
      gitPush: { id: 'gitPush', name: '推送至 GitHub master', status: 'success' },
      actionsDeploy: { id: 'actionsDeploy', name: 'GitHub Actions 部署', status: 'success' },
    },
  };

  const renderPublishPage = () =>
    render(React.createElement(MemoryRouter, null, React.createElement(PublishPage, null)));

  it('21. P2: Frontend disconnect recovery: when publishPipeline throws network error, catch block queries getPublishTask with the SAME taskId and recovers in-progress task', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(localApiService, 'getPublishPreview').mockResolvedValue({ willPublish: [], willKeepPrivate: [], willKeepDraft: [] });
    vi.spyOn(localApiService, 'getPublishHistory').mockResolvedValue([]);
    vi.spyOn(localApiService, 'getCurrentPublishTask').mockResolvedValue({ inProgress: false, task: null });
    const publishSpy = vi.spyOn(localApiService, 'publishPipeline').mockRejectedValue(new Error('Network error (Failed to fetch)'));
    const getTaskSpy = vi.spyOn(localApiService, 'getPublishTask').mockResolvedValue({ found: true, isLive: true, task: mockRunningTask });

    renderPublishPage();
    const btn = await screen.findByRole('button', { name: /一鍵發布至 GitHub Pages/ });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(publishSpy).toHaveBeenCalledTimes(1);
      expect(getTaskSpy).toHaveBeenCalledTimes(1);
    });

    // Verify same taskId was passed
    const passedTaskId = publishSpy.mock.calls[0][1];
    expect(passedTaskId).toBeDefined();
    expect(getTaskSpy).toHaveBeenCalledWith(passedTaskId);

    // Verify reconnect notice appears
    expect(await screen.findByText(/本機連線短暫不穩定，後端發布管線仍在背景安全執行中/)).toBeInTheDocument();

    // Verify publishPipeline was NOT called again
    expect(publishSpy).toHaveBeenCalledTimes(1);
  });

  it('22. P2: Frontend disconnect recovery: when publishPipeline throws network error, catch block recovers completed record and displays commit SHA', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(localApiService, 'getPublishPreview').mockResolvedValue({ willPublish: [], willKeepPrivate: [], willKeepDraft: [] });
    vi.spyOn(localApiService, 'getPublishHistory').mockResolvedValue([]);
    vi.spyOn(localApiService, 'getCurrentPublishTask').mockResolvedValue({ inProgress: false, task: null });
    vi.spyOn(localApiService, 'getDeploymentStatus').mockResolvedValue({
      status: 'completed',
      conclusion: 'success',
      pagesStatus: 'success',
      isMatchSha: true,
      pagesDeploymentSha: TARGET_SHA_40,
    });
    const publishSpy = vi.spyOn(localApiService, 'publishPipeline').mockRejectedValue(new Error('Socket hung up'));
    const getTaskSpy = vi.spyOn(localApiService, 'getPublishTask').mockResolvedValue({ found: true, isLive: false, record: mockCompletedRecord });

    renderPublishPage();
    const btn = await screen.findByRole('button', { name: /一鍵發布至 GitHub Pages/ });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(publishSpy).toHaveBeenCalledTimes(1);
      expect(getTaskSpy).toHaveBeenCalledTimes(1);
    });

    const passedTaskId = publishSpy.mock.calls[0][1];
    expect(getTaskSpy).toHaveBeenCalledWith(passedTaskId);

    // Verify completed state restored
    expect(await screen.findByText(/已成功推送至 GitHub/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(mockCompletedRecord.commitHash!.slice(0, 7)))).toBeInTheDocument();

    // Verify no retry of publishPipeline
    expect(publishSpy).toHaveBeenCalledTimes(1);
  });

  it('23. P2: Frontend disconnect recovery: when getPublishTask fails/not found, alerts error and does NOT claim success', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(localApiService, 'getPublishPreview').mockResolvedValue({ willPublish: [], willKeepPrivate: [], willKeepDraft: [] });
    vi.spyOn(localApiService, 'getPublishHistory').mockResolvedValue([]);
    vi.spyOn(localApiService, 'getCurrentPublishTask').mockResolvedValue({ inProgress: false, task: null });
    vi.spyOn(localApiService, 'publishPipeline').mockRejectedValue(new Error('Fatal connection drop'));
    vi.spyOn(localApiService, 'getPublishTask').mockResolvedValue({ found: false, isLive: false });

    renderPublishPage();
    const btn = await screen.findByRole('button', { name: /一鍵發布至 GitHub Pages/ });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Fatal connection drop'));
    });
    expect(screen.queryByText(/已成功推送至 GitHub/)).not.toBeInTheDocument();
    expect(screen.queryByText(/正式網站已就緒 \(Live\)/)).not.toBeInTheDocument();
  });

  it('24. P2 (Reload): Mounting during in-progress publish restores in-progress status from getCurrentPublishTask and publishing is true', async () => {
    vi.spyOn(localApiService, 'getPublishPreview').mockResolvedValue({ willPublish: [], willKeepPrivate: [], willKeepDraft: [] });
    vi.spyOn(localApiService, 'getPublishHistory').mockResolvedValue([]);
    vi.spyOn(localApiService, 'getCurrentPublishTask').mockResolvedValue({ inProgress: true, task: mockRunningTask });
    const publishSpy = vi.spyOn(localApiService, 'publishPipeline');

    renderPublishPage();

    // Verify active publishing indicator
    expect(await screen.findByText(/發布管線執行中\.\.\./)).toBeInTheDocument();
    expect(publishSpy).not.toHaveBeenCalled();
  });

  it('25. P2 (Reload): Mounting after publish completed restores latest record from history and publishing is false', async () => {
    vi.spyOn(localApiService, 'getPublishPreview').mockResolvedValue({ willPublish: [], willKeepPrivate: [], willKeepDraft: [] });
    vi.spyOn(localApiService, 'getPublishHistory').mockResolvedValue([mockCompletedRecord]);
    vi.spyOn(localApiService, 'getCurrentPublishTask').mockResolvedValue({ inProgress: false, task: null });
    const publishSpy = vi.spyOn(localApiService, 'publishPipeline');

    renderPublishPage();

    // Verify publishing is false, button is standard
    const btn = await screen.findByRole('button', { name: /一鍵發布至 GitHub Pages/ });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
    expect(screen.getByText(new RegExp(mockCompletedRecord.commitHash!.slice(0, 7)))).toBeInTheDocument();
    expect(publishSpy).not.toHaveBeenCalled();
  });

  it('26. P2 (Reload): Older deployment success is strictly NOT mistaken for current publish success', async () => {
    vi.spyOn(localApiService, 'getPublishPreview').mockResolvedValue({ willPublish: [], willKeepPrivate: [], willKeepDraft: [] });
    vi.spyOn(localApiService, 'getPublishHistory').mockResolvedValue([mockCompletedRecord]);
    vi.spyOn(localApiService, 'getCurrentPublishTask').mockResolvedValue({ inProgress: false, task: null });
    vi.spyOn(localApiService, 'getDeploymentStatus').mockResolvedValue({
      status: 'completed',
      conclusion: 'success',
      pagesStatus: 'pending',
      isMatchSha: false,
      pagesDeploymentSha: undefined,
    });

    renderPublishPage();

    await waitFor(() => {
      expect(screen.getByText(/Pages 排程等待中/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/正式網站已就緒 \(Live\)/)).not.toBeInTheDocument();
  });
});
