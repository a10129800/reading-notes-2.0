import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  saveMasterBook,
  getMasterBook,
  deleteMasterBook,
  saveBookCover,
  getBookCoverPath,
  deleteBookCover,
  publishWhitelistedBooks,
  createBackup,
  restoreBackup,
  detectImageFormat,
  PUBLIC_CONTENT_DIR,
  PRIVATE_DATA_DIR,
  DEFAULT_PUBLIC_DIR,
} from '../server/storage';
import { verifyPublicBooksSecurity } from '../server/gitPublisher';
import { Book } from '../src/types';

describe('Book Cover Management & Security Suite (18 Scenarios)', () => {
  const testBookId = 'test-cover-spec-book';
  const privateTestBookId = 'test-cover-private-book';
  const draftTestBookId = 'test-cover-draft-book';
  const externalBookId = 'test-cover-external-book';

  // Minimal valid complete 1x1 image buffers
  const validJpgBuffer = Buffer.from([
    0xff, 0xd8, // SOI
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, // APP0
    0xff, 0xdb, 0x00, 0x43, 0x00, 0x03, 0x02, 0x02, 0x03, 0x02, 0x02, 0x03, 0x03, 0x03, 0x03, 0x04, 0x03, 0x03, 0x04, 0x05,
    0x08, 0x05, 0x05, 0x04, 0x04, 0x05, 0x0a, 0x07, 0x07, 0x06, 0x08, 0x0c, 0x0a, 0x0c, 0x0c, 0x0b, 0x0a, 0x0b, 0x0b, 0x0d,
    0x0e, 0x12, 0x10, 0x0d, 0x0e, 0x11, 0x0e, 0x0b, 0x0b, 0x10, 0x16, 0x10, 0x11, 0x13, 0x14, 0x15, 0x15, 0x15, 0x0c, 0x0f,
    0x17, 0x18, 0x16, 0x14, 0x18, 0x12, 0x14, 0x15, 0x14, // DQT
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, // SOF0 (1x1 px)
    0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x09, // DHT
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x37, // SOS
    0xff, 0xd9 // EOI
  ]);

  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82
  ]);

  const validWebpBuffer = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c,
    0x0e, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00, 0x10, 0x07, 0x10, 0x11, 0x11, 0x88, 0x88, 0xfe,
    0x07, 0x00
  ]);

  const createTestBook = (id: string, status: 'public' | 'private' | 'draft', coverImage = ''): Book => ({
    id,
    title: `測試書籍 ${id}`,
    author: '測試作者',
    publisher: '測試出版社',
    publishDate: '2026-01-01',
    isbn: '9780000000000',
    category: '測試類別',
    status,
    readingStatus: 'reading',
    progress: 30,
    motivation: '測試動機',
    introduction: '測試簡介',
    coreIdea: '測試核心思想',
    tags: ['測試'],
    chapters: [],
    startDate: '2026-01-01',
    coverImage,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  beforeEach(() => {
    // Ensure test books exist in private sandbox
    saveMasterBook(createTestBook(testBookId, 'public'));
  });

  afterEach(() => {
    // Clean up test books from sandbox
    [testBookId, privateTestBookId, draftTestBookId, externalBookId].forEach(id => {
      try { deleteMasterBook(id); } catch {}
      const pubDir = path.join(PUBLIC_CONTENT_DIR, id);
      if (fs.existsSync(pubDir)) {
        try { fs.rmSync(pubDir, { recursive: true, force: true }); } catch {}
      }
    });
  });

  it('1. 正常上傳 JPG 封面並成功儲存與更新 book.json', () => {
    const res = saveBookCover(testBookId, validJpgBuffer);
    expect(res.success).toBe(true);
    expect(res.coverImage).toBe('cover.jpg');

    const book = getMasterBook(testBookId);
    expect(book?.coverImage).toBe('cover.jpg');

    const coverInfo = getBookCoverPath(testBookId);
    expect(coverInfo).not.toBeNull();
    expect(coverInfo?.mime).toBe('image/jpeg');
    expect(coverInfo?.filename).toBe('cover.jpg');
    expect(fs.existsSync(coverInfo!.filePath)).toBe(true);
  });

  it('2. 正常上傳 PNG 封面並成功儲存與更新 MIME', () => {
    const res = saveBookCover(testBookId, validPngBuffer);
    expect(res.success).toBe(true);
    expect(res.coverImage).toBe('cover.png');

    const coverInfo = getBookCoverPath(testBookId);
    expect(coverInfo?.mime).toBe('image/png');
    expect(coverInfo?.filename).toBe('cover.png');
  });

  it('3. 正常上傳 WebP 封面並成功儲存與更新 MIME', () => {
    const res = saveBookCover(testBookId, validWebpBuffer);
    expect(res.success).toBe(true);
    expect(res.coverImage).toBe('cover.webp');

    const coverInfo = getBookCoverPath(testBookId);
    expect(coverInfo?.mime).toBe('image/webp');
    expect(coverInfo?.filename).toBe('cover.webp');
  });

  it('4. 超過 5MB 之圖片上傳被嚴格拒絕', () => {
    const hugeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024, 0xff);
    expect(() => saveBookCover(testBookId, hugeBuffer)).toThrow(/exceeds 5MB limit/);
  });

  it('5. 偽造副檔名 (非圖片二進位) 被魔術位元組嚴格拒絕', () => {
    const fakeTextDisguised = Buffer.from('This is a fake text file disguised with jpg extension');
    expect(() => saveBookCover(testBookId, fakeTextDisguised)).toThrow(/Invalid image content/);
  });

  it('6. 非圖片內容 (如 SVG、HTML、執行檔偽裝) 被嚴格拒絕', () => {
    const fakeSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect(() => saveBookCover(testBookId, fakeSvg)).toThrow(/Invalid image content/);

    const fakeExe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    expect(() => saveBookCover(testBookId, fakeExe)).toThrow(/Invalid image content/);
  });

  it('7. 書籍 ID 帶有非法字元或路徑穿越時被拒絕', () => {
    expect(() => saveBookCover('../traversal-book', validJpgBuffer)).toThrow();
  });

  it('8. 更換封面後舊封面檔案被正確清理，不殘留多餘檔案', () => {
    // First save JPG
    saveBookCover(testBookId, validJpgBuffer);
    const bookDir = path.join(PRIVATE_DATA_DIR, 'books', testBookId);
    expect(fs.existsSync(path.join(bookDir, 'cover.jpg'))).toBe(true);

    // Replace with WebP
    saveBookCover(testBookId, validWebpBuffer);
    expect(fs.existsSync(path.join(bookDir, 'cover.webp'))).toBe(true);
    expect(fs.existsSync(path.join(bookDir, 'cover.jpg'))).toBe(false); // Old cover deleted
  });

  it('9. 移除封面後實體檔案被刪除，book.json 清空為預設封面', () => {
    saveBookCover(testBookId, validJpgBuffer);
    const bookDir = path.join(PRIVATE_DATA_DIR, 'books', testBookId);
    expect(fs.existsSync(path.join(bookDir, 'cover.jpg'))).toBe(true);

    const removed = deleteBookCover(testBookId);
    expect(removed).toBe(true);
    expect(fs.existsSync(path.join(bookDir, 'cover.jpg'))).toBe(false);

    const book = getMasterBook(testBookId);
    expect(book?.coverImage).toBe('');

    const coverInfo = getBookCoverPath(testBookId);
    expect(coverInfo).toBeNull();
  });

  it('10. public 書籍的封面隨一鍵發布成功複製至公開目錄且相對路徑正確', () => {
    saveBookCover(testBookId, validJpgBuffer);
    const pubResult = publishWhitelistedBooks();
    expect(pubResult.publishedBooks).toContain(`測試書籍 ${testBookId}`);

    const pubDir = path.join(PUBLIC_CONTENT_DIR, testBookId);
    expect(fs.existsSync(pubDir)).toBe(true);
    expect(fs.existsSync(path.join(pubDir, 'cover.jpg'))).toBe(true);

    const pubBook = JSON.parse(fs.readFileSync(path.join(pubDir, 'book.json'), 'utf-8'));
    expect(pubBook.coverImage).toBe(`content/public-books/${testBookId}/cover.jpg`);
  });

  it('11. private 書籍的封面絕不發布至公開目錄', () => {
    saveMasterBook(createTestBook(privateTestBookId, 'private'));
    saveBookCover(privateTestBookId, validJpgBuffer);

    publishWhitelistedBooks();

    const pubDir = path.join(PUBLIC_CONTENT_DIR, privateTestBookId);
    expect(fs.existsSync(pubDir)).toBe(false); // Completely absent
  });

  it('12. draft 書籍的封面絕不發布至公開目錄', () => {
    saveMasterBook(createTestBook(draftTestBookId, 'draft'));
    saveBookCover(draftTestBookId, validPngBuffer);

    publishWhitelistedBooks();

    const pubDir = path.join(PUBLIC_CONTENT_DIR, draftTestBookId);
    expect(fs.existsSync(pubDir)).toBe(false);
  });

  it('13. 外部 URL 書籍維持相容，不會被覆蓋或清空', () => {
    const extUrl = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c';
    saveMasterBook(createTestBook(externalBookId, 'public', extUrl));

    publishWhitelistedBooks();

    const pubDir = path.join(PUBLIC_CONTENT_DIR, externalBookId);
    expect(fs.existsSync(pubDir)).toBe(true);
    const pubBook = JSON.parse(fs.readFileSync(path.join(pubDir, 'book.json'), 'utf-8'));
    expect(pubBook.coverImage).toBe(extUrl); // Preserved
  });

  it('14. 白名單封面符合規範時通過 verifyPublicBooksSecurity 審核', () => {
    saveBookCover(testBookId, validJpgBuffer);
    publishWhitelistedBooks();

    const secRes = verifyPublicBooksSecurity();
    expect(secRes.valid).toBe(true);
  });

  it('15. 非 cover.* 的圖片 (如 scan.jpg) 依然被安全檢查嚴格阻擋', () => {
    publishWhitelistedBooks();
    const fakeScan = path.join(PUBLIC_CONTENT_DIR, testBookId, 'raw-scan-01.jpg');
    fs.writeFileSync(fakeScan, validJpgBuffer);

    try {
      const secRes = verifyPublicBooksSecurity();
      expect(secRes.valid).toBe(false);
      expect(secRes.error).toContain('未授權之附件或非封面圖片檔');
    } finally {
      if (fs.existsSync(fakeScan)) fs.unlinkSync(fakeScan);
    }
  });

  it('16. 備份與還原機制包含本機封面檔案且還原無損', () => {
    saveBookCover(testBookId, validJpgBuffer);
    const backupRes = createBackup();
    expect(backupRes.filename).toBeDefined();

    // Remove cover from disk
    deleteBookCover(testBookId);
    expect(getBookCoverPath(testBookId)).toBeNull();

    // Restore from backup
    const restoreRes = restoreBackup(backupRes.filename);
    expect(restoreRes.restoredCovers).toBeGreaterThanOrEqual(1);

    const restoredPath = getBookCoverPath(testBookId);
    expect(restoredPath).not.toBeNull();
    expect(restoredPath?.filename).toBe('cover.jpg');
    expect(fs.existsSync(restoredPath!.filePath)).toBe(true);
  });

  it('17. 舊版未包含 bookCovers 的備份封包仍能正常還原 (向下相容)', () => {
    const backupRes = createBackup();
    const backupPath = path.join(PRIVATE_DATA_DIR, 'backups', backupRes.filename);

    // Strip bookCovers to simulate legacy v2.0.0 backup
    const raw = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    delete raw.bookCovers;
    fs.writeFileSync(backupPath, JSON.stringify(raw, null, 2), 'utf-8');

    const restoreRes = restoreBackup(backupRes.filename);
    expect(restoreRes.restoredBooks).toBeGreaterThanOrEqual(1);
  });

  it('18. 整個封面測試過程絕對不觸碰、不污染正式倉庫 content/public-books', () => {
    const realPublicDir = DEFAULT_PUBLIC_DIR;
    expect(fs.existsSync(path.join(realPublicDir, 'books-manifest.json'))).toBe(true);

    // Verify all books listed in real manifest actually exist and are public
    const manifest = JSON.parse(fs.readFileSync(path.join(realPublicDir, 'books-manifest.json'), 'utf-8'));
    expect(manifest.books.length).toBeGreaterThanOrEqual(1);
    for (const b of manifest.books) {
      expect(b.status).toBe('public');
      const bPath = path.join(realPublicDir, b.id, 'book.json');
      expect(fs.existsSync(bPath)).toBe(true);
      const bData = JSON.parse(fs.readFileSync(bPath, 'utf-8'));
      expect(bData.status).toBe('public');
    }

    // Verify demoted/private books strictly do NOT exist in real public repository
    expect(fs.existsSync(path.join(realPublicDir, 'the-effective-executive'))).toBe(false);

    // None of the test book IDs ever leak to real repository
    expect(fs.existsSync(path.join(realPublicDir, testBookId))).toBe(false);
    expect(fs.existsSync(path.join(realPublicDir, privateTestBookId))).toBe(false);
    expect(fs.existsSync(path.join(realPublicDir, draftTestBookId))).toBe(false);
  });

  it('19. 只有合法 Magic Bytes 但實際內容損壞的圖片必須被嚴格拒絕', () => {
    // Corrupt JPEG: valid FF D8 FF header followed by random garbage with no SOF/SOS
    const corruptJpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef]);
    expect(() => saveBookCover(testBookId, corruptJpg)).toThrow(/Invalid image content/);

    // Corrupt PNG: valid PNG signature but corrupted chunk structure
    const corruptPng = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x05, 0x46, 0x41, 0x4b, 0x45, 0x01, 0x02, 0x03, 0x04, 0x05, 0x00, 0x00, 0x00, 0x00
    ]);
    expect(() => saveBookCover(testBookId, corruptPng)).toThrow(/Invalid image content/);

    // Corrupt WebP: valid RIFF...WEBP header but missing VP8 keyframe start code (0x9D012A)
    const corruptWebp = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      0x56, 0x50, 0x38, 0x20, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x11, 0x22, 0x33, 0x01, 0x00, 0x01, 0x00
    ]);
    expect(() => saveBookCover(testBookId, corruptWebp)).toThrow(/Invalid image content/);
  });

  it('20. 截斷圖片 (未完整下載或 premature EOF) 必須被拒絕', () => {
    // Truncate valid JPEG before EOI (FF D9)
    const truncatedJpg = validJpgBuffer.subarray(0, validJpgBuffer.length - 2);
    expect(() => saveBookCover(testBookId, truncatedJpg)).toThrow(/缺少結尾 EOI|截斷/);

    // Truncate valid PNG before IEND
    const truncatedPng = validPngBuffer.subarray(0, validPngBuffer.length - 12);
    expect(() => saveBookCover(testBookId, truncatedPng)).toThrow(/缺少結尾 IEND|截斷/);

    // Truncate valid WebP: declare 1000 bytes in RIFF but provide only 34 bytes
    const truncatedWebp = Buffer.from(validWebpBuffer);
    truncatedWebp.writeUInt32LE(1000, 4);
    expect(() => saveBookCover(testBookId, truncatedWebp)).toThrow(/小於容器宣告長度|截斷/);
  });

  it('21. 超過寬度或高度上限 (4096px) 的圖片必須被拒絕', () => {
    // Construct PNG with width 5000px (> 4096)
    const oversizedWidthPng = Buffer.from(validPngBuffer);
    oversizedWidthPng.writeUInt32BE(5000, 16); // write width = 5000 in IHDR
    expect(() => saveBookCover(testBookId, oversizedWidthPng)).toThrow(/超過最大允許上限/);

    // Construct PNG with height 5000px (> 4096)
    const oversizedHeightPng = Buffer.from(validPngBuffer);
    oversizedHeightPng.writeUInt32BE(5000, 20); // write height = 5000 in IHDR
    expect(() => saveBookCover(testBookId, oversizedHeightPng)).toThrow(/超過最大允許上限/);
  });

  it('22. 超過總像素上限 (16,000,000 像素，如極端解壓縮炸彈) 的圖片必須被拒絕', () => {
    // Construct PNG with 4096 x 4096 = 16,777,216 pixels (> 16,000,000)
    const pixelBombPng = Buffer.from(validPngBuffer);
    pixelBombPng.writeUInt32BE(4096, 16);
    pixelBombPng.writeUInt32BE(4096, 20);
    expect(() => saveBookCover(testBookId, pixelBombPng)).toThrow(/超過安全上限.*疑似解壓縮炸彈/);
  });

  it('23. 驗證失敗時原有合法封面完好無損，不被覆蓋或破壞 (原子防護)', () => {
    // First save valid JPG
    saveBookCover(testBookId, validJpgBuffer);
    const bookDir = path.join(PRIVATE_DATA_DIR, 'books', testBookId);
    const originalJpgPath = path.join(bookDir, 'cover.jpg');
    const originalBytes = fs.readFileSync(originalJpgPath);
    expect(originalBytes.equals(validJpgBuffer)).toBe(true);

    // Attempt to upload invalid / corrupted image
    const corruptBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0xaa, 0xbb]);
    expect(() => saveBookCover(testBookId, corruptBuffer)).toThrow();

    // Verify existing cover is 100% intact
    expect(fs.existsSync(originalJpgPath)).toBe(true);
    const afterAttemptBytes = fs.readFileSync(originalJpgPath);
    expect(afterAttemptBytes.equals(validJpgBuffer)).toBe(true);

    // Verify book.json still references cover.jpg
    const book = getMasterBook(testBookId);
    expect(book?.coverImage).toBe('cover.jpg');
  });

  it('24. inspectAndValidateImage 正確解析正常圖片之實際寬度、高度與像素數', async () => {
    const { inspectAndValidateImage } = await import('../server/imageValidator');
    const resJpg = inspectAndValidateImage(validJpgBuffer);
    expect(resJpg.valid).toBe(true);
    if (resJpg.valid) {
      expect(resJpg.format).toBe('jpg');
      expect(resJpg.width).toBe(1);
      expect(resJpg.height).toBe(1);
      expect(resJpg.pixels).toBe(1);
    }

    const resPng = inspectAndValidateImage(validPngBuffer);
    expect(resPng.valid).toBe(true);
    if (resPng.valid) {
      expect(resPng.format).toBe('png');
      expect(resPng.width).toBe(1);
      expect(resPng.height).toBe(1);
    }

    const resWebp = inspectAndValidateImage(validWebpBuffer);
    expect(resWebp.valid).toBe(true);
    if (resWebp.valid) {
      expect(resWebp.format).toBe('webp');
      expect(resWebp.width).toBe(1);
      expect(resWebp.height).toBe(1);
    }
  });
});

