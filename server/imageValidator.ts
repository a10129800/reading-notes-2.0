import zlib from 'zlib';

/**
 * Image dimension and security limits for Reading Notes 2.0 covers
 */
export const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_COVER_WIDTH = 4096;           // 4096 px
export const MAX_COVER_HEIGHT = 4096;          // 4096 px
export const MAX_COVER_PIXELS = 16_000_000;    // 16 Megapixels (e.g. 4000x4000)
export const MIN_COVER_WIDTH = 1;              // 1 px
export const MIN_COVER_HEIGHT = 1;             // 1 px

export type SupportedImageFormat = 'jpg' | 'png' | 'webp';

export interface ImageInspectionSuccess {
  valid: true;
  format: SupportedImageFormat;
  width: number;
  height: number;
  pixels: number;
  sizeBytes: number;
}

export interface ImageInspectionFailure {
  valid: false;
  format?: SupportedImageFormat;
  width?: number;
  height?: number;
  error: string;
}

export type ImageInspectionResult = ImageInspectionSuccess | ImageInspectionFailure;

/**
 * Fast magic-byte format detection (Preserves backward compatibility)
 */
export function detectImageFormat(buffer: Buffer): SupportedImageFormat | null {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // WebP: RIFF (0-3) + WEBP (8-11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
}

/**
 * Deep inspection and structural decode verification for JPEG, PNG, and WebP
 *
 * Verifies:
 * 1. Binary file signature
 * 2. Structural completeness (all required chunks/markers present)
 * 3. Absence of truncation (premature EOF)
 * 4. PNG IDAT zlib decompression integrity (catches corrupted raster payloads & decompression bombs)
 * 5. Extraction of actual width & height
 * 6. Bounds checking against MAX_COVER_WIDTH, MAX_COVER_HEIGHT, MAX_COVER_PIXELS
 */
export function inspectAndValidateImage(buffer: Buffer): ImageInspectionResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: '圖片檔案為空 (0 bytes)！' };
  }

  if (buffer.length > MAX_COVER_SIZE) {
    return {
      valid: false,
      error: `圖片檔案大小 (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) 超過 5MB 上限！`,
    };
  }

  const detectedFormat = detectImageFormat(buffer);
  if (!detectedFormat) {
    return {
      valid: false,
      error: '非合法之圖片檔案格式：僅支援 JPEG, PNG, WebP。嚴格阻擋 SVG、HTML 或可執行檔！',
    };
  }

  try {
    if (detectedFormat === 'png') {
      return inspectPng(buffer);
    } else if (detectedFormat === 'jpg') {
      return inspectJpeg(buffer);
    } else {
      return inspectWebp(buffer);
    }
  } catch (err: any) {
    return {
      valid: false,
      format: detectedFormat,
      error: `圖片結構驗證或解碼失敗：${err.message}`,
    };
  }
}

/**
 * PNG chunk parser and IDAT zlib decompression verifier
 */
function inspectPng(buffer: Buffer): ImageInspectionResult {
  if (buffer.length < 33) {
    return { valid: false, format: 'png', error: 'PNG 檔案過短或被截斷，無法構成完整標頭！' };
  }

  let offset = 8; // skip 8-byte signature
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let hasIhdr = false;
  let hasIend = false;
  const idatChunks: Buffer[] = [];

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) {
      return { valid: false, format: 'png', error: 'PNG 區塊標頭不完整，檔案已被截斷！' };
    }

    const chunkLen = buffer.readUInt32BE(offset);
    const chunkType = buffer.toString('ascii', offset + 4, offset + 8);
    const chunkDataOffset = offset + 8;
    const chunkEnd = chunkDataOffset + chunkLen + 4; // data + 4 bytes CRC

    if (chunkEnd > buffer.length) {
      return { valid: false, format: 'png', error: `PNG 區塊 "${chunkType}" 長度超出檔案結尾，檔案已被截斷！` };
    }

    if (!hasIhdr) {
      if (chunkType !== 'IHDR' || chunkLen !== 13) {
        return { valid: false, format: 'png', error: 'PNG 第一個區塊必須為合法的 IHDR！' };
      }
      hasIhdr = true;
      width = buffer.readUInt32BE(chunkDataOffset);
      height = buffer.readUInt32BE(chunkDataOffset + 4);
      bitDepth = buffer[chunkDataOffset + 8];
      colorType = buffer[chunkDataOffset + 9];

      // Validate color types: 0 (grayscale), 2 (RGB), 3 (palette), 4 (grayscale+alpha), 6 (RGBA)
      if (![0, 2, 3, 4, 6].includes(colorType)) {
        return { valid: false, format: 'png', error: `PNG 色彩類型 (${colorType}) 無效或不受支援！` };
      }
    } else if (chunkType === 'IDAT') {
      idatChunks.push(buffer.subarray(chunkDataOffset, chunkDataOffset + chunkLen));
    } else if (chunkType === 'IEND') {
      hasIend = true;
      break;
    }

    offset = chunkEnd;
  }

  if (!hasIhdr) {
    return { valid: false, format: 'png', error: 'PNG 遺失 IHDR 區塊！' };
  }

  if (idatChunks.length === 0) {
    return { valid: false, format: 'png', error: 'PNG 缺少 IDAT 影像光柵資料區塊，內容損壞！' };
  }

  if (!hasIend) {
    return { valid: false, format: 'png', error: 'PNG 缺少結尾 IEND 區塊，檔案未完整下載或被截斷！' };
  }

  // Dimension checks
  const dimError = checkDimensions(width, height);
  if (dimError) {
    return { valid: false, format: 'png', width, height, error: dimError };
  }

  // Verify IDAT zlib stream decompression (Prevents fake magic bytes with random noise / decompression bombs)
  const fullIdat = Buffer.concat(idatChunks);
  try {
    // Max uncompressed raster calculation to prevent memory exhaustion (Decompression Bomb protection)
    const bytesPerPixel = (colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1) * Math.ceil(bitDepth / 8);
    const expectedScanline = 1 + width * bytesPerPixel;
    const maxAllowedUncompressed = Math.min(expectedScanline * height + 4096, 64 * 1024 * 1024);

    zlib.inflateSync(fullIdat, {
      maxOutputLength: maxAllowedUncompressed,
    });
  } catch (err: any) {
    return {
      valid: false,
      format: 'png',
      width,
      height,
      error: `PNG IDAT 壓縮光柵串流損壞或解壓縮失敗：${err.message}`,
    };
  }

  return {
    valid: true,
    format: 'png',
    width,
    height,
    pixels: width * height,
    sizeBytes: buffer.length,
  };
}

/**
 * JPEG marker segment parser and structural completion verifier
 */
function inspectJpeg(buffer: Buffer): ImageInspectionResult {
  if (buffer.length < 4) {
    return { valid: false, format: 'jpg', error: 'JPEG 檔案過短，無法構成合法標頭！' };
  }

  let offset = 2; // skip SOI (FF D8)
  let width = 0;
  let height = 0;
  let foundSof = false;
  let foundSos = false;
  let foundEoi = false;

  while (offset < buffer.length) {
    // Skip padding 0xFF bytes
    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset++;
    }
    if (offset >= buffer.length) break;

    const marker = buffer[offset++];

    // EOI (End of Image)
    if (marker === 0xd9) {
      foundEoi = true;
      break;
    }

    // Standalone markers without length: RST0..RST7 (0xD0..0xD7), TEM (0x01)
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0x00) {
      continue;
    }

    // Start of Scan (SOS)
    if (marker === 0xda) {
      foundSos = true;
      if (offset + 2 > buffer.length) {
        return { valid: false, format: 'jpg', error: 'JPEG SOS 標頭長度被截斷！' };
      }
      const headerLen = buffer.readUInt16BE(offset);
      offset += headerLen;

      // Scan through entropy data to ensure proper EOI (FF D9) termination
      let scanIdx = offset;
      while (scanIdx < buffer.length - 1) {
        if (buffer[scanIdx] === 0xff) {
          const nextByte = buffer[scanIdx + 1];
          if (nextByte === 0xd9) {
            foundEoi = true;
            break;
          }
          if (nextByte === 0x00) {
            // Escaped FF byte
            scanIdx += 2;
            continue;
          }
        }
        scanIdx++;
      }
      break;
    }

    // Standard marker segments with 2-byte length
    if (offset + 2 > buffer.length) {
      return { valid: false, format: 'jpg', error: `JPEG 標記 (0x${marker.toString(16)}) 長度被截斷！` };
    }

    const segLen = buffer.readUInt16BE(offset);
    if (segLen < 2) {
      return { valid: false, format: 'jpg', error: `JPEG 標記 (0x${marker.toString(16)}) 長度欄位異常 (${segLen})！` };
    }

    if (offset + segLen > buffer.length) {
      return { valid: false, format: 'jpg', error: `JPEG 標記 (0x${marker.toString(16)}) 資料長度超出檔案結尾，檔案已被截斷！` };
    }

    // SOFn markers (Start of Frame: Baseline 0xC0, Extended 0xC1, Progressive 0xC2, etc.)
    const isSof = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker);
    if (isSof && !foundSof) {
      foundSof = true;
      // Precision is at offset + 2
      height = buffer.readUInt16BE(offset + 3);
      width = buffer.readUInt16BE(offset + 5);
    }

    offset += segLen;
  }

  if (!foundSof) {
    return { valid: false, format: 'jpg', error: 'JPEG 遺失 SOF 影格標記，無法解析影像維度或內容已損壞！' };
  }

  if (!foundSos) {
    return { valid: false, format: 'jpg', error: 'JPEG 缺少 SOS 掃描資料區段，未包含實體圖像資料！' };
  }

  if (!foundEoi) {
    return { valid: false, format: 'jpg', error: 'JPEG 缺少結尾 EOI (FF D9) 標記，檔案不完整或傳輸已被截斷！' };
  }

  // Dimension checks
  const dimError = checkDimensions(width, height);
  if (dimError) {
    return { valid: false, format: 'jpg', width, height, error: dimError };
  }

  return {
    valid: true,
    format: 'jpg',
    width,
    height,
    pixels: width * height,
    sizeBytes: buffer.length,
  };
}

/**
 * WebP RIFF container, VP8/VP8L/VP8X chunk parser and keyframe verifier
 */
function inspectWebp(buffer: Buffer): ImageInspectionResult {
  if (buffer.length < 20) {
    return { valid: false, format: 'webp', error: 'WebP 檔案過短，無法構成完整標頭！' };
  }

  // RIFF container size check
  const containerSize = buffer.readUInt32LE(4);
  const totalExpectedSize = containerSize + 8;
  if (buffer.length < totalExpectedSize) {
    return {
      valid: false,
      format: 'webp',
      error: `WebP 實體長度 (${buffer.length} bytes) 小於容器宣告長度 (${totalExpectedSize} bytes)，檔案已被截斷！`,
    };
  }

  const fourCC = buffer.toString('ascii', 12, 16);
  let width = 0;
  let height = 0;

  if (fourCC === 'VP8 ') {
    // Lossy simple format: requires keyframe code 0x9D 0x01 0x2A
    if (buffer.length < 30) {
      return { valid: false, format: 'webp', error: 'WebP VP8 標頭過短！' };
    }
    const keyframeByte = buffer[20];
    const isKeyframe = (keyframeByte & 1) === 0;
    if (!isKeyframe) {
      return { valid: false, format: 'webp', error: 'WebP 封面必須包含完整 Keyframe 獨立影格！' };
    }
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) {
      return { valid: false, format: 'webp', error: 'WebP VP8 影格同步簽章 (0x9D012A) 無效，圖像已損壞！' };
    }
    width = buffer.readUInt16LE(26) & 0x3fff;
    height = buffer.readUInt16LE(28) & 0x3fff;
  } else if (fourCC === 'VP8L') {
    // Lossless simple format: byte 20 must be 0x2F
    if (buffer.length < 25) {
      return { valid: false, format: 'webp', error: 'WebP VP8L 標頭過短！' };
    }
    if (buffer[20] !== 0x2f) {
      return { valid: false, format: 'webp', error: 'WebP VP8L 簽章 (0x2F) 無效，圖像已損壞！' };
    }
    const b0 = buffer[21];
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];
    width = 1 + (((b1 & 0x3f) << 8) | b0);
    height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
  } else if (fourCC === 'VP8X') {
    // Extended format: canvas width/height at bytes 24-29
    if (buffer.length < 30) {
      return { valid: false, format: 'webp', error: 'WebP VP8X 標頭過短！' };
    }
    width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
    height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
  } else {
    return {
      valid: false,
      format: 'webp',
      error: `不支援或未知之 WebP 子格式區塊 ("${fourCC}")！`,
    };
  }

  // Dimension checks
  const dimError = checkDimensions(width, height);
  if (dimError) {
    return { valid: false, format: 'webp', width, height, error: dimError };
  }

  return {
    valid: true,
    format: 'webp',
    width,
    height,
    pixels: width * height,
    sizeBytes: buffer.length,
  };
}

/**
 * Check dimensions and total pixel count against security bounds
 */
function checkDimensions(width: number, height: number): string | null {
  if (width < MIN_COVER_WIDTH || height < MIN_COVER_HEIGHT) {
    return `圖片維度異常：寬度 (${width}px) 與高度 (${height}px) 必須大於 0！`;
  }

  if (width > MAX_COVER_WIDTH) {
    return `圖片寬度 (${width}px) 超過最大允許上限 (${MAX_COVER_WIDTH}px)！`;
  }

  if (height > MAX_COVER_HEIGHT) {
    return `圖片高度 (${height}px) 超過最大允許上限 (${MAX_COVER_HEIGHT}px)！`;
  }

  const totalPixels = width * height;
  if (totalPixels > MAX_COVER_PIXELS) {
    return `圖片總像素 (${totalPixels.toLocaleString()} 像素) 超過安全上限 (${MAX_COVER_PIXELS.toLocaleString()} 像素)，疑似解壓縮炸彈！`;
  }

  return null;
}

