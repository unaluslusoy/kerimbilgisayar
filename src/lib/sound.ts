// Basit sesli geri bildirim — harici ses dosyası gerektirmez, Web Audio API ile üretilir.
let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) audioCtx = new AudioContextClass();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function beep(frequency: number, durationMs: number, startDelayMs = 0, volume = 0.15) {
  const ctx = getContext();
  if (!ctx) return;
  const startTime = ctx.currentTime + startDelayMs / 1000;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationMs / 1000);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + durationMs / 1000 + 0.02);
}

export function playAddSound() {
  beep(880, 90);
}

export function playErrorSound() {
  beep(220, 130);
  beep(160, 160, 140);
}

export function playSuccessSound() {
  beep(660, 90);
  beep(990, 140, 100);
}
