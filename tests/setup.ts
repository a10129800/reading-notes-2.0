import '@testing-library/jest-dom';
import fs from 'fs';
import path from 'path';
import { beforeAll, afterAll } from 'vitest';

// 1. Establish isolated sandbox paths inside node_modules/.tmp/ (Git-ignored)
const SANDBOX_ROOT = path.resolve(process.cwd(), 'node_modules/.tmp/test-sandbox');
const SANDBOX_PRIVATE = path.join(SANDBOX_ROOT, 'private-storage');
const SANDBOX_PUBLIC = path.join(SANDBOX_ROOT, 'public-books');

// 2. Set environment variables immediately before any other project module is evaluated
process.env.PRIVATE_DATA_DIR = SANDBOX_PRIVATE;
process.env.PUBLIC_CONTENT_DIR = SANDBOX_PUBLIC;

/**
 * Initialize test sandbox directories and seed baseline public sample data
 */
export function initTestSandbox() {
  // Ensure private directories exist
  const privateDirs = [
    SANDBOX_PRIVATE,
    path.join(SANDBOX_PRIVATE, 'books'),
    path.join(SANDBOX_PRIVATE, 'drafts'),
    path.join(SANDBOX_PRIVATE, 'images'),
    path.join(SANDBOX_PRIVATE, 'attachments'),
    path.join(SANDBOX_PRIVATE, 'backups'),
  ];
  for (const d of privateDirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }

  // Ensure public sandbox directory exists
  if (!fs.existsSync(SANDBOX_PUBLIC)) {
    fs.mkdirSync(SANDBOX_PUBLIC, { recursive: true });
  }

  // Seed sample book (the-effective-executive) from repo into sandbox if present
  const repoSampleDir = path.resolve(process.cwd(), 'content/public-books/the-effective-executive');
  const sandboxPublicSample = path.join(SANDBOX_PUBLIC, 'the-effective-executive');
  const sandboxPrivateSample = path.join(SANDBOX_PRIVATE, 'books', 'the-effective-executive');

  if (fs.existsSync(repoSampleDir)) {
    if (!fs.existsSync(sandboxPublicSample)) {
      fs.cpSync(repoSampleDir, sandboxPublicSample, { recursive: true });
    }
    if (!fs.existsSync(sandboxPrivateSample)) {
      fs.cpSync(repoSampleDir, sandboxPrivateSample, { recursive: true });
    }
  }

  // Seed baseline manifest into public sandbox
  const manifestPath = path.join(SANDBOX_PUBLIC, 'books-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    const bookJsonPath = path.join(sandboxPublicSample, 'book.json');
    let sampleBook = null;
    if (fs.existsSync(bookJsonPath)) {
      try {
        sampleBook = JSON.parse(fs.readFileSync(bookJsonPath, 'utf-8'));
      } catch {}
    }
    const manifest = {
      version: '2.0.0',
      generatedAt: new Date().toISOString(),
      siteTitle: 'Reading Notes 2.0 | 個人數位閱讀與知識整理平台',
      siteDescription: '測試沙盒環境',
      totalPublicBooks: sampleBook ? 1 : 0,
      categories: sampleBook ? [sampleBook.category] : [],
      tags: sampleBook ? (sampleBook.tags || []) : [],
      books: sampleBook ? [sampleBook] : [],
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }
}

// Seed sandbox initially upon loading setup.ts
initTestSandbox();

beforeAll(() => {
  initTestSandbox();
});

afterAll(() => {
  try {
    if (fs.existsSync(SANDBOX_ROOT)) {
      fs.rmSync(SANDBOX_ROOT, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup file lock errors on Windows
  }
});
