const uploadCacheVersion = '20260707';

export function mediaUrl(url?: string | null, width?: number): string {
  if (!url) return '';

  let trimmedUrl = url.trim();
  if (!trimmedUrl) return '';

  // Unsplash Optimization
  if (trimmedUrl.includes('images.unsplash.com')) {
    try {
      const u = new URL(trimmedUrl);
      u.searchParams.set('auto', 'format');
      u.searchParams.set('fit', 'crop');
      if (!u.searchParams.has('q')) {
        u.searchParams.set('q', '80');
      }
      if (width) {
        u.searchParams.set('w', width.toString());
      } else if (!u.searchParams.has('w')) {
        // Fallback to a default optimized width (1000px is a good balance for hero/large sections)
        u.searchParams.set('w', '1000');
      }
      trimmedUrl = u.toString();
    } catch (e) {
      // Fallback in case of URL parse error
    }
  }

  const isLocalUpload = trimmedUrl.startsWith('/uploads/');
  const isLocalAsset = trimmedUrl.startsWith('/assets/images/');
  const isAbsoluteUpload = /^https?:\/\/kerimbilgisayar\.com\/uploads\//i.test(trimmedUrl);
  const isAbsoluteAsset = /^https?:\/\/kerimbilgisayar\.com\/assets\/images\//i.test(trimmedUrl);

  if (!isLocalUpload && !isLocalAsset && !isAbsoluteUpload && !isAbsoluteAsset) {
    return trimmedUrl;
  }

  if (/[?&]v=/.test(trimmedUrl)) {
    return trimmedUrl;
  }

  return `${trimmedUrl}${trimmedUrl.includes('?') ? '&' : '?'}v=${uploadCacheVersion}`;
}

