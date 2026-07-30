import { useState, useEffect, useCallback } from 'react';

// Tam ekran (Fullscreen API) — PWA standalone modda bile kalan tarayıcı/OS
// çubuklarını kaldırmak için kullanılır (manifest "standalone" modu tek
// başına tam ekranı garanti etmez).
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const enterFullscreen = useCallback((el: HTMLElement = document.documentElement) => {
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const toggleFullscreen = useCallback((el?: HTMLElement) => {
    if (document.fullscreenElement) {
      exitFullscreen();
    } else {
      enterFullscreen(el);
    }
  }, [enterFullscreen, exitFullscreen]);

  return { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen };
}
