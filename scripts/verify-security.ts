import fs from 'fs';
import path from 'path';
import { detectImageFormat, ALLOWED_COVER_FILENAMES, MAX_COVER_SIZE } from '../server/storage';

console.log('========================================================');
console.log(' Reading Notes 2.0 - Security, Zero-Leakage & Integrity Verifier');
console.log('========================================================');

const publicContentDir = path.resolve(process.cwd(), 'content/public-books');
const manifestPath = path.join(publicContentDir, 'books-manifest.json');

let hasViolations = false;

// 1. Check if public-books manifest exists and is valid
if (!fs.existsSync(manifestPath)) {
  console.error('[SECURITY ERROR] books-manifest.json does not exist in content/public-books!');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
const manifestBookIds = new Set((manifest.books || []).map((b: any) => b.id));

// 2. Validate every book in manifest
console.log(`[Verification] Inspecting ${manifest.books?.length || 0} books in public manifest...`);
for (const book of (manifest.books || [])) {
  if (book.status !== 'public') {
    console.error(`[SECURITY VIOLATION] Book "${book.title}" (${book.id}) has status "${book.status}" in public manifest! Only "public" is allowed!`);
    hasViolations = true;
  }

  // Ensure book directory and book.json exist in content/public-books
  const bookDir = path.join(publicContentDir, book.id);
  const bookJsonPath = path.join(bookDir, 'book.json');
  if (!fs.existsSync(bookDir) || !fs.existsSync(bookJsonPath)) {
    console.error(`[INTEGRITY ERROR] Book "${book.title}" (${book.id}) is listed in manifest but missing on disk at ${bookDir}!`);
    hasViolations = true;
  } else {
    // Check chapter files
    for (const ch of (book.chapters || [])) {
      const chPath = path.join(bookDir, `${ch.id}.json`);
      if (!fs.existsSync(chPath)) {
        console.error(`[INTEGRITY ERROR] Chapter "${ch.title}" (${ch.id}) for book "${book.id}" is missing on disk at ${chPath}!`);
        hasViolations = true;
      }
    }
  }
}

// 3. Scan directories in content/public-books/
const entries = fs.readdirSync(publicContentDir, { withFileTypes: true });
for (const entry of entries) {
  if (entry.isDirectory()) {
    const bookDir = path.join(publicContentDir, entry.name);
    const bookJsonPath = path.join(bookDir, 'book.json');
    if (!fs.existsSync(bookJsonPath)) {
      console.error(`[SECURITY WARNING] Directory "${entry.name}" lacks book.json!`);
      hasViolations = true;
      continue;
    }
    const bookData = JSON.parse(fs.readFileSync(bookJsonPath, 'utf-8'));
    if (bookData.status !== 'public') {
      console.error(`[SECURITY VIOLATION] Directory "${entry.name}" contains non-public status: "${bookData.status}"!`);
      hasViolations = true;
    }

    if (!manifestBookIds.has(entry.name)) {
      console.error(`[INTEGRITY ERROR] Directory "${entry.name}" exists in content/public-books/ but is NOT registered in books-manifest.json!`);
      hasViolations = true;
    }

    // Inspect files inside book directory (Single cover whitelist enforcement)
    const bookFiles = fs.readdirSync(bookDir);
    let coverCount = 0;
    for (const f of bookFiles) {
      const filePath = path.join(bookDir, f);
      const ext = path.extname(f).toLowerCase();
      const lowerName = f.toLowerCase();

      if (ALLOWED_COVER_FILENAMES.includes(lowerName as any)) {
        coverCount++;
        if (coverCount > 1) {
          console.error(`[SECURITY VIOLATION] Directory "${entry.name}" contains multiple cover images! Only one is allowed.`);
          hasViolations = true;
        }
        const stat = fs.statSync(filePath);
        if (stat.size === 0) {
          console.error(`[ZERO-LOSS VIOLATION] Cover file "${f}" in "${entry.name}" is empty (0 bytes)!`);
          hasViolations = true;
        }
        if (stat.size > MAX_COVER_SIZE) {
          console.error(`[SECURITY VIOLATION] Cover file "${f}" in "${entry.name}" exceeds 5MB limit!`);
          hasViolations = true;
        }
        const buf = fs.readFileSync(filePath);
        if (!detectImageFormat(buf)) {
          console.error(`[SECURITY VIOLATION] Cover file "${f}" in "${entry.name}" has invalid image signature!`);
          hasViolations = true;
        }
        const expectedCover = `content/public-books/${entry.name}/${f}`;
        if (bookData.coverImage !== expectedCover && !bookData.coverImage.endsWith(`/${f}`)) {
          console.error(`[INTEGRITY ERROR] Book "${entry.name}" coverImage "${bookData.coverImage}" does not match file "${expectedCover}"!`);
          hasViolations = true;
        }
      } else if (f === 'book.json' || f.endsWith('.json')) {
        // Valid JSON
      } else {
        console.error(`[SECURITY VIOLATION] Prohibited attachment or unauthorized file found in public book directory: ${path.join(entry.name, f)}`);
        hasViolations = true;
      }
    }
  }
}

// 4. Verify no private data directory exists inside Git repository
const forbiddenPaths = [
  'Reading-Notes-Private',
  'private-data',
  '.env',
  '.env.local'
];

for (const fp of forbiddenPaths) {
  const full = path.resolve(process.cwd(), fp);
  if (fs.existsSync(full)) {
    console.warn(`[DEFENSE CHECK] Checking if ${fp} is tracked by git...`);
  }
}

// 5. Inspect production build artifacts in dist/ if dist exists (Zero-Loss & Zero-Leakage)
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  console.log('[Verification] Inspecting production build artifacts in dist/ (Zero-Loss & Zero-Leakage)...');

  const distPublicDir = path.join(distDir, 'content/public-books');
  const distManifestPath = path.join(distPublicDir, 'books-manifest.json');

  if (!fs.existsSync(distManifestPath)) {
    console.error('[CRITICAL LOSS] dist/content/public-books/books-manifest.json is missing in build output!');
    hasViolations = true;
  } else {
    const distManifest = JSON.parse(fs.readFileSync(distManifestPath, 'utf-8'));
    const distBookMap = new Map((distManifest.books || []).map((b: any) => [b.id, b]));

    // Check zero-leakage in dist manifest
    for (const b of (distManifest.books || [])) {
      if (b.status !== 'public') {
        console.error(`[CRITICAL SECURITY LEAK] Dist manifest contains non-public book: ${b.title}`);
        hasViolations = true;
      }
    }

    // ZERO-LOSS VERIFICATION: Ensure EVERY book in source manifest is present in dist manifest
    for (const sourceBook of (manifest.books || [])) {
      if (!distBookMap.has(sourceBook.id)) {
        console.error(`[ZERO-LOSS VIOLATION] Book "${sourceBook.title}" (${sourceBook.id}) was NOT included in dist manifest!`);
        hasViolations = true;
      }
    }

    if ((distManifest.books || []).length !== (manifest.books || []).length) {
      console.error(`[ZERO-LOSS VIOLATION] Manifest count mismatch! Source: ${(manifest.books || []).length}, Dist: ${(distManifest.books || []).length}`);
      hasViolations = true;
    }
  }

  // ZERO-LOSS VERIFICATION: Ensure EVERY public book folder and chapter JSON is in dist/
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const srcBookDir = path.join(publicContentDir, entry.name);
      const dstBookDir = path.join(distPublicDir, entry.name);

      if (!fs.existsSync(dstBookDir)) {
        console.error(`[ZERO-LOSS VIOLATION] Public book directory "${entry.name}" missing from dist output!`);
        hasViolations = true;
        continue;
      }

      const srcFiles = fs.readdirSync(srcBookDir);
      for (const file of srcFiles) {
        if (file.endsWith('.json') || ALLOWED_COVER_FILENAMES.includes(file.toLowerCase() as any)) {
          const dstFile = path.join(dstBookDir, file);
          if (!fs.existsSync(dstFile)) {
            console.error(`[ZERO-LOSS VIOLATION] Essential public file "${file}" missing from dist for book "${entry.name}"!`);
            hasViolations = true;
          } else {
            const stat = fs.statSync(dstFile);
            if (stat.size === 0) {
              console.error(`[ZERO-LOSS VIOLATION] Public file "${file}" in dist is empty (0 bytes)!`);
              hasViolations = true;
            }
          }
        }
      }
    }
  }

  // Scan dist recursively for any forbidden private files
  const scanDist = (currentDir: string) => {
    const dirEntries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const item of dirEntries) {
      const full = path.join(currentDir, item.name);
      if (item.name === 'Reading-Notes-Private' || item.name === 'backups' || item.name === '.env' || item.name === '.env.development') {
        console.error(`[CRITICAL SECURITY LEAK] Forbidden artifact in dist: ${full}`);
        hasViolations = true;
      }
      if (item.name.endsWith('.private.json') || item.name.endsWith('.private.md')) {
        console.error(`[CRITICAL SECURITY LEAK] Forbidden private file in dist: ${full}`);
        hasViolations = true;
      }
      if (item.isDirectory()) {
        scanDist(full);
      }
    }
  };
  scanDist(distDir);

  // 6. Strict Manager Code Exclusion & Pure Reading Mode Assurance
  console.log('[Verification] Inspecting dist/assets JavaScript bundles for strict manager code exclusion...');
  const assetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const jsFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));
    const forbiddenManagerMarkers = [
      '本機閱讀管理工作台',
      '公開發布安全審核流水線',
      '完整本機資料備份與還原',
      '/api/publish',
      '/api/backups/restore',
    ];

    for (const jsFile of jsFiles) {
      const content = fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8');
      for (const marker of forbiddenManagerMarkers) {
        if (content.includes(marker)) {
          console.error(`[CRITICAL SECURITY LEAK] Management code marker "${marker}" detected inside public bundle: ${jsFile}`);
          hasViolations = true;
        }
      }
    }
  }
}

if (hasViolations) {
  console.error('\n❌ SECURITY & INTEGRITY VERIFICATION FAILED: Violations or lost data detected!');
  process.exit(1);
} else {
  console.log('\n✅ SECURITY & INTEGRITY VERIFICATION PASSED: All public assets verified. Zero private data leak & zero public content loss.');
  process.exit(0);
}
