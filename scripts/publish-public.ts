import { publishWhitelistedBooks } from '../server/storage';

console.log('====================================================');
console.log(' Reading Notes 2.0 - Whitelist Safe Publish Pipeline');
console.log('====================================================');

try {
  const result = publishWhitelistedBooks();
  console.log(`[SafePublish] Successfully processed whitelist publication:`);
  console.log(`  - Public Books Published: ${result.publishedCount}`);
  result.publishedBooks.forEach(name => console.log(`    * ${name}`));
  if (result.removedCount > 0) {
    console.log(`  - Demoted/Non-public directories purged: ${result.removedCount}`);
  }
  console.log('[SafePublish] Public manifest generated successfully.');
  process.exit(0);
} catch (err: any) {
  console.error('[SafePublish] FATAL ERROR during publication:', err);
  process.exit(1);
}
