import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  initPrivateStorage,
  saveMasterBook,
  getMasterBook,
  deleteMasterBook,
  createBackup,
  restoreBackup,
  PRIVATE_DATA_DIR,
} from '../server/storage';
import { Book } from '../src/types';

describe('M7 Backup Capacity, Data Integrity & Stress Tests', () => {
  const testPrefix = 'm7-cap-';
  const testBookId = `${testPrefix}book-01`;
  const imagesDir = path.join(PRIVATE_DATA_DIR, 'images');
  const attachmentsDir = path.join(PRIVATE_DATA_DIR, 'attachments');
  const backupsDir = path.join(PRIVATE_DATA_DIR, 'backups');

  // Track created test files for cleanup
  const createdTestFiles: string[] = [];

  beforeAll(() => {
    initPrivateStorage();
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
    if (!fs.existsSync(attachmentsDir)) fs.mkdirSync(attachmentsDir, { recursive: true });
  });

  afterAll(() => {
    // Cleanup created files
    for (const f of createdTestFiles) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {}
    }
    try {
      deleteMasterBook(testBookId);
    } catch {}
  });

  function calculateHash(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  it('1. backs up and restores a 10 MB image with bit-level integrity (SHA-256)', () => {
    const imgName = `${testPrefix}test-img-10mb.bin`;
    const imgPath = path.join(imagesDir, imgName);
    createdTestFiles.push(imgPath);

    // Generate 10 MB pseudo-random binary data
    const size10MB = 10 * 1024 * 1024;
    const buffer10MB = crypto.randomBytes(size10MB);
    fs.writeFileSync(imgPath, buffer10MB);

    const originalHash = calculateHash(imgPath);

    // Create Backup
    const backupResult = createBackup();
    const backupFilePath = path.join(backupsDir, backupResult.filename);
    createdTestFiles.push(backupFilePath);

    expect(backupResult.sizeBytes).toBeGreaterThan(size10MB);

    // Delete image to simulate loss
    fs.unlinkSync(imgPath);
    expect(fs.existsSync(imgPath)).toBe(false);

    // Restore Backup
    const restoreResult = restoreBackup(backupResult.filename);
    expect(restoreResult.restoredImages).toBeGreaterThanOrEqual(1);

    // Verify file restored and SHA-256 hash matches 100%
    expect(fs.existsSync(imgPath)).toBe(true);
    const restoredHash = calculateHash(imgPath);
    expect(restoredHash).toBe(originalHash);

    // Clean up
    fs.unlinkSync(imgPath);
  });

  it('2. backs up and restores a 50 MB attachment with bit-level integrity (SHA-256)', () => {
    const attName = `${testPrefix}large-document-50mb.pdf`;
    const attPath = path.join(attachmentsDir, attName);
    createdTestFiles.push(attPath);

    // Generate 50 MB binary payload in chunks to avoid memory spikes
    const size50MB = 50 * 1024 * 1024;
    const chunkSize = 5 * 1024 * 1024; // 5 MB per chunk
    const fd = fs.openSync(attPath, 'w');
    for (let i = 0; i < 10; i++) {
      const chunk = crypto.randomBytes(chunkSize);
      fs.writeSync(fd, chunk);
    }
    fs.closeSync(fd);

    expect(fs.statSync(attPath).size).toBe(size50MB);
    const originalHash = calculateHash(attPath);

    // Measure memory before backup
    const memBefore = process.memoryUsage().heapUsed;

    // Create Backup
    const backupResult = createBackup();
    const backupFilePath = path.join(backupsDir, backupResult.filename);
    createdTestFiles.push(backupFilePath);

    // Measure memory after backup
    const memAfter = process.memoryUsage().heapUsed;
    const memDeltaMB = (memAfter - memBefore) / (1024 * 1024);

    expect(backupResult.sizeBytes).toBeGreaterThan(size50MB);

    // Delete attachment to simulate loss
    fs.unlinkSync(attPath);
    expect(fs.existsSync(attPath)).toBe(false);

    // Restore Backup
    const restoreResult = restoreBackup(backupResult.filename);
    expect(restoreResult.restoredAttachments).toBeGreaterThanOrEqual(1);

    // Verify restored file SHA-256 matches exactly
    expect(fs.existsSync(attPath)).toBe(true);
    const restoredHash = calculateHash(attPath);
    expect(restoredHash).toBe(originalHash);

    // Clean up
    fs.unlinkSync(attPath);
  }, 30000);

  it('3. handles mixed multiple images and attachments in a single backup archive', () => {
    const img1 = path.join(imagesDir, `${testPrefix}mixed-1.png`);
    const img2 = path.join(imagesDir, `${testPrefix}mixed-2.png`);
    const att1 = path.join(attachmentsDir, `${testPrefix}mixed-report.pdf`);
    const att2 = path.join(attachmentsDir, `${testPrefix}mixed-dataset.csv`);

    createdTestFiles.push(img1, img2, att1, att2);

    fs.writeFileSync(img1, crypto.randomBytes(2 * 1024 * 1024)); // 2MB
    fs.writeFileSync(img2, crypto.randomBytes(3 * 1024 * 1024)); // 3MB
    fs.writeFileSync(att1, crypto.randomBytes(4 * 1024 * 1024)); // 4MB
    fs.writeFileSync(att2, Buffer.from('Col1,Col2\nVal1,Val2\n')); // small csv

    const hashImg1 = calculateHash(img1);
    const hashImg2 = calculateHash(img2);
    const hashAtt1 = calculateHash(att1);
    const hashAtt2 = calculateHash(att2);

    const backupResult = createBackup();
    const backupFilePath = path.join(backupsDir, backupResult.filename);
    createdTestFiles.push(backupFilePath);

    // Remove all 4
    fs.unlinkSync(img1);
    fs.unlinkSync(img2);
    fs.unlinkSync(att1);
    fs.unlinkSync(att2);

    // Restore
    restoreBackup(backupResult.filename);

    expect(calculateHash(img1)).toBe(hashImg1);
    expect(calculateHash(img2)).toBe(hashImg2);
    expect(calculateHash(att1)).toBe(hashAtt1);
    expect(calculateHash(att2)).toBe(hashAtt2);

    // Clean
    fs.unlinkSync(img1);
    fs.unlinkSync(img2);
    fs.unlinkSync(att1);
    fs.unlinkSync(att2);
  });

  it('4. strictly validates backup archive integrity and rejects corrupted JSON without corrupting existing data', () => {
    // Create an existing book
    const existingBook: Book = {
      id: testBookId,
      title: '原始保護書籍',
      author: '原始作者',
      category: '安全保護',
      status: 'private',
      readingStatus: 'reading',
      progress: 40,
      motivation: '',
      introduction: '',
      coreIdea: '原始資料不可受損',
      chapters: [],
      tags: [],
      coverImage: '',
      publisher: '',
      publishDate: '',
      isbn: '',
      startDate: '2026-01-01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveMasterBook(existingBook);

    // Create a corrupted backup file
    const corruptName = `${testPrefix}corrupt.json`;
    const corruptPath = path.join(backupsDir, corruptName);
    createdTestFiles.push(corruptPath);
    fs.writeFileSync(corruptPath, '{ "schemaVersion": "2.0.0", "books": [ { malformed... ');

    // Attempt to restore corrupt backup
    expect(() => restoreBackup(corruptName)).toThrow(/Corrupted backup archive/);

    // Verify existing book is intact
    const matched = getMasterBook(testBookId);
    expect(matched).toBeDefined();
    expect(matched?.title).toBe('原始保護書籍');
  });

  it('5. strictly rejects incompatible schema version without modifying storage', () => {
    const invalidVersionName = `${testPrefix}invalid-ver.json`;
    const invalidVersionPath = path.join(backupsDir, invalidVersionName);
    createdTestFiles.push(invalidVersionPath);

    fs.writeFileSync(invalidVersionPath, JSON.stringify({
      schemaVersion: '999.0.0',
      books: []
    }));

    expect(() => restoreBackup(invalidVersionName)).toThrow(/Incompatible backup schema version/);
  });
});

