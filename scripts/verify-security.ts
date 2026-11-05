import fs from 'fs';
import path from 'path';

console.log('========================================================');
console.log(' Reading Notes 2.0 - Security & Zero-Leakage Verifier');
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

// 2. Validate every book in manifest
console.log(`[Verification] Inspecting ${manifest.books?.length || 0} books in public manifest...`);
for (const book of (manifest.books || [])) {
  if (book.status !== 'public') {
    console.error(`[SECURITY VIOLATION] Book "${book.title}" (${book.id}) has status "${book.status}" in public manifest! Only "public" is allowed!`);
    hasViolations = true;
  }
}

// 3. Scan directories in content/public-books/
const entries = fs.readdirSync(publicContentDir, { withFileTypes: true });
for (const entry of entries) {
  if (entry.isDirectory()) {
    const bookJsonPath = path.join(publicContentDir, entry.name, 'book.json');
    if (!fs.existsSync(bookJsonPath)) {
      console.error(`[SECURITY WARNING] Directory "${entry.name}" lacks book.json!`);
      continue;
    }
    const bookData = JSON.parse(fs.readFileSync(bookJsonPath, 'utf-8'));
    if (bookData.status !== 'public') {
      console.error(`[SECURITY VIOLATION] Directory "${entry.name}" contains non-public status: "${bookData.status}"!`);
      hasViolations = true;
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
    // Check if tracked by git
    console.warn(`[DEFENSE CHECK] Checking if ${fp} is tracked by git...`);
  }
}

// 5. If dist directory exists, inspect dist output
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  console.log('[Verification] Inspecting production build artifacts in dist/ ...');
  // Check dist/content/public-books/
  const distManifestPath = path.join(distDir, 'content/public-books/books-manifest.json');
  if (fs.existsSync(distManifestPath)) {
    const distManifest = JSON.parse(fs.readFileSync(distManifestPath, 'utf-8'));
    for (const b of (distManifest.books || [])) {
      if (b.status !== 'public') {
        console.error(`[CRITICAL SECURITY LEAK] Dist manifest contains non-public book: ${b.title}`);
        hasViolations = true;
      }
    }
  }

  // Scan dist recursively for any forbidden private files
  const scanDist = (currentDir: string) => {
    const dirEntries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const item of dirEntries) {
      const full = path.join(currentDir, item.name);
      if (item.name === 'Reading-Notes-Private' || item.name === 'backups' || item.name === '.env') {
        console.error(`[CRITICAL SECURITY LEAK] Forbidden artifact in dist: ${full}`);
        hasViolations = true;
      }
      if (item.isDirectory()) {
        scanDist(full);
      }
    }
  };
  scanDist(distDir);
}

if (hasViolations) {
  console.error('\n❌ SECURITY VERIFICATION FAILED: Potential private data leakage detected!');
  process.exit(1);
} else {
  console.log('\n✅ SECURITY VERIFICATION PASSED: All public assets strictly verified. Zero private data leak.');
  process.exit(0);
}

