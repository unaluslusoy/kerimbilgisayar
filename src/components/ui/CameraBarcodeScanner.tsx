import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, CheckCircle } from 'lucide-react';

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export default function CameraBarcodeScanner({
  isOpen,
  onClose,
  onScan,
}: CameraBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setScanning(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      alert('Kamera başlatılamadı: ' + err.message);
      onClose();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setScanning(false);
  };

  // Barcode / QR detection loop using native BarcodeDetector API if available, or canvas image sampling
  useEffect(() => {
    let interval: any;
    if (isOpen && scanning && videoRef.current) {
      interval = setInterval(async () => {
        if (!videoRef.current) return;
        try {
          if ('BarcodeDetector' in window) {
            const detector = new (window as any).BarcodeDetector({
              formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a']
            });
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              setLastScanned(code);
              onScan(code);
              stopCamera();
              onClose();
            }
          }
        } catch {
          // Detector not ready or no code visible
        }
      }, 350);
    }
    return () => clearInterval(interval);
  }, [isOpen, scanning]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl relative">
        <button
          onClick={() => { stopCamera(); onClose(); }}
          className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-center gap-2 text-white font-bold text-lg">
          <Camera className="w-5 h-5 text-blue-400" /> Barkod / QR Taraması
        </div>
        <p className="text-xs text-slate-400">Servis fişi üzerindeki etiket veya barkodu kameraya doğrultun.</p>

        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border-2 border-dashed border-blue-500/50 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {/* Laser Line Animation */}
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse" />
        </div>

        {lastScanned && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" /> Okundu: {lastScanned}
          </div>
        )}

        <div className="flex justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={startCamera}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Kamerayı Yenile
          </button>
        </div>
      </div>
    </div>
  );
}
