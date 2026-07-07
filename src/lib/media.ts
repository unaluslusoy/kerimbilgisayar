const uploadCacheVersion = '20260707';

export function mediaUrl(url?: string | null): string {
  if (!url) return '';

  const trimmedUrl = url.trim();
  if (!trimmedUrl) return '';

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
