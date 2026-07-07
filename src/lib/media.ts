const uploadCacheVersion = '20260707';

export function mediaUrl(url?: string | null): string {
  if (!url) return '';

  const trimmedUrl = url.trim();
  if (!trimmedUrl) return '';

  const isLocalUpload = trimmedUrl.startsWith('/uploads/');
  const isAbsoluteUpload = /^https?:\/\/kerimbilgisayar\.com\/uploads\//i.test(trimmedUrl);

  if (!isLocalUpload && !isAbsoluteUpload) {
    return trimmedUrl;
  }

  if (/[?&]v=/.test(trimmedUrl)) {
    return trimmedUrl;
  }

  return `${trimmedUrl}${trimmedUrl.includes('?') ? '&' : '?'}v=${uploadCacheVersion}`;
}
