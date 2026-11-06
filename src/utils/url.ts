/**
 * Resolves book cover image URL seamlessly across environments
 * Handles:
 * - External absolute URLs: http:// or https:// (keeps as is)
 * - Base64 data URLs: data:image/... (keeps as is)
 * - Public repository relative assets: content/public-books/... (prepends BASE_URL)
 */
export function resolveCoverUrl(coverImage?: string, bookId?: string): string {
  if (!coverImage || typeof coverImage !== 'string') return '';
  const trimmed = coverImage.trim();
  if (!trimmed) return '';

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const base = import.meta.env.BASE_URL || './';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  let cleanPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;

  // Auto-resolve bare filenames (e.g. "cover.png", "cover.jpg") to book's public directory
  if (bookId && (cleanPath.startsWith('cover.') || !cleanPath.includes('/'))) {
    cleanPath = `content/public-books/${bookId}/${cleanPath}`;
  }

  return `${cleanBase}${cleanPath}`;
}

